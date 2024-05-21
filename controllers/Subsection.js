const Section = require("../models/Section");
const SubSection = require("../models/Subsection");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

exports.createSubSection = async (req, res) => {
  try {
    // fetch data from req body : sectionId ? because we are creating subsection and insert(or update) into ? Section that's why sectionId
    const { sectionId, title, description } = req.body;

    // extract file/video
    const video = req.files.video;

    // validation
    if (!sectionId || !title || !description || !video) {
      return res
        .status(404)
        .json({ success: false, message: "All Fields are Required" });
    }
    console.log(video);

    // upload cloudinary: Do we need to store video? no -> store video Url
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    );
    console.log(uploadDetails);

    // Create a new sub-section with the necessary information
    const SubSectionDetails = await SubSection.create({
      title: title,
      timeDuration: `${uploadDetails.duration}`,
      description: description,
      videoUrl: uploadDetails.secure_url,
    });

    // Update the corresponding section with the newly created sub-section
    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $push: { subSection: SubSectionDetails._id } },
      { new: true }
    ).populate("subSection");

    // Return the updated section in the response
    return res.status(200).json({ success: true, data: updatedSection });
  } catch (error) {
    // Handle any errors that may occur during the process
    console.error("Error creating new sub-section:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateSubSection = async (req, res) => {
  try {
    // Extract sectionId, title, and description from the request body
    const { sectionId, title, description } = req.body;

    // Find the sub-section by its ID
    const subSection = await SubSection.findById(sectionId);

    // If the sub-section is not found, return a 404 response
    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      });
    }

    // Update the sub-section's title if it is provided
    if (title !== undefined) {
      subSection.title = title;
    }

    // Update the sub-section's description if it is provided
    if (description !== undefined) {
      subSection.description = description;
    }

    // Check if a video file is provided in the request
    if (req.files && req.files.video !== undefined) {
      // Extract the video file from the request
      const video = req.files.video;

      // Upload the video to Cloudinary and get the upload details
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      );

      // Update the sub-section's video URL and duration
      subSection.videoUrl = uploadDetails.secure_url;
      subSection.timeDuration = `${uploadDetails.duration}`;
    }

    // Save the updated sub-section to the database
    await subSection.save();

    // Return a success response
    return res.json({
      success: true,
      message: "Section updated successfully",
    });
  } catch (error) {
    // Log any errors that occur
    console.error(error);

    // Return a 500 response if an error occurs
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the section",
    });
  }
};

exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body;
    // Update the corresponding section by removing the subSectionId from its subSection array
    await Section.findByIdAndUpdate(
      { _id: sectionId },
      {
        $pull: {
          subSection: subSectionId,
        },
      }
    );

    // Delete the subSection document
    const subSection = await SubSection.findByIdAndDelete({
      _id: subSectionId,
    });

    // Check if the subSection was found and deleted
    if (!subSection) {
      return res
        .status(404)
        .json({ success: false, message: "SubSection not found" });
    }

    return res.json({
      success: true,
      message: "SubSection deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the SubSection",
    });
  }
};
