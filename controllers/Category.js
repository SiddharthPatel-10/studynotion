const Category = require("../models/Category");


// createCategory controller
exports.createCategory = async (req, res) => {
  try {
    // Get data from req body
    const { name, description } = req.body;

    // validation
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    // create category
    const CategoryDetails = await Category.create({
      name: name,
      description: description,
    });
    console.log(CategoryDetails);

    // return response
    return res.status(200).json({
      success: true,
      message: "Categorys Created Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: true,
      message: error.message,
    });
  }
};

// showAllCategories controller
exports.showAllCategories = async (req, res) => {
  try {
    console.log("Show All categories");
    const allCategorys = await Category.find({});
    res.status(200).json({
      success: false,
      data: allCategorys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// categoryPageDetails controller
exports.categoryPageDetails = async(req, res) => {
    try {
        
    } catch (error) {
        
    }
}