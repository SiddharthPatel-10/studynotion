const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

//create a course 
exports.createCourse = async (req, res) => {
  try {
    // Get user id from req body
    const userId = req.user.id;
    // get all required fields from request body
    const {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag,
      category,
      status,
      instructors,
    } = req.body;

    // get thumbnail from req body
    const thumbnail = req.files.thumbnailImage;

    // validation
    if (
      !courseName ||
      !courseDescription ||
      !whatYouWillLearn ||
      !price ||
      !tag ||
      !thumbnail ||
      !category
    ) {
      return res.status(400).json({
        success: false,
        message: "All the fileds are requied",
      });
    }
    if (!status || status === undefined) {
      status = "Draft";
    }

    // check User is an Instructor or not
    const instructorDetails = await User.findById(userId, {
      accountType: "Instructor",
    });
    console.log("Instructor details :", instructorDetails);
    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor details not found",
      });
    }

    // check category is valid or not
    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      });
    }

    // upload thumbail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      process.env.FOLDER_NAME
    );
    console.log(thumbnail);

    // create a Course with given details
    const newCourse = await Course.create({
      // Instructor is a ObjeectId (means store ObjectId in instructor. we pass instructor as a reference in course model) in Course Model. that's why we fetch instructorDetails and userID in the above code.
      instructor: instructorDetails._id,
      courseName,
      courseDescription,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tag: tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      status: status,
      instructions: instructions,
    });

    // add new course to the User schema of the Instructor
    await User.findByIdAndUpdate(
      { _id: instructorDetails._id },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    );

    // add new course to the Categories
    await Category.findByIdAndUpdate(
      { _id: Category },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    );

    // Return the new course and a success message
    res.status(200).json({
      success: true,
      data: newCourse,
      message: "Course Created Successfully",
    });
  } catch (error) {
    // handle error that occurs during the creation of the course
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create Course",
    });
  }
};

// getAllCourses 
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find(
      {},
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReviews: true,
        studentsEnroled: true,
      }
    )
      .populate("instructor")
      .exec();

    return res.status(200).json({
      success: true,
      data: allCourses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "can't fetch Course data",
      error: error.message,
    });
  }
};

// getCourseDetails
exports.getCourseDetails = async (req, res) => {
  try {
    // get Id
    const { courseId } = req.body;

    // find course Details
    const courseDetails = await Course.find({ _id: courseId })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    //validation
    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find the course with ${courseId}`,
      });
    }

    // return response
    return res.status(200).json({
      success: true,
      data: courseDetails,
      message: "Course detailed fetch Successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
