const bcrypt = require("bcrypt");
const User = require("../models/User");
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
require("dotenv").config();

//Signup Controller for Registering User's
exports.signup = async (req, res) => {
  try {
    // destructure fields from request body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      contactNumber,
      accountType,
      otp,
    } = req.body;

    //check if all fields are their or not
    if (
      !firstName ||
      !lastName ||
      !password ||
      !confirmPassword ||
      !email ||
      !otp
    ) {
      return res.status(403).send({
        success: false,
        message: "All the fields are required",
      });
    }
    // check if passowrd and confirmPassword are same or not
    if (password != confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and confirm Password does not match. please try again.",
      });
    }
    //check User already exist or not
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exist. please sign in to continue.",
      });
    }
    //Find most recent otp for the email
    const response = await OTP.findOne({ email })
      .sort({ createdAt: -1 })
      .limit(1);
    console.log(response);
    if (response.length === 0) {
      //otp is not found for this email
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      });
    } else if (otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: " The OTP is not valid",
      });
    }

    //hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    //create the User
    let approved = "";
    approved === "Instructor" ? (approved = false) : (approved = true);

    //create additional details for the user
    const profileDetails = await Profile.create({
      gender: null,
      about: null,
      dateOfBirth: null,
      contactNumber: null,
    });
    const user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password: hashedPassword,
      accountType: accountType,
      approved: approved,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
    });

    return res.status(200).json({
      success: true,
      user,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. please try again.",
    });
  }
};

// Login controller for authenticating user
exports.login = async (req, res) => {
  try {
    // get email and password from req body
    const { email, password } = req.body;

    //validation of email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        messasge: "All the fields are required",
      });
    }
    // find user with provided email
    const user = await User.findOne({ email }).populate("additionalDetails");

    // if user not found with provided email return response
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User is not registered with us. Please signUp to continue",
      });
    }
    // Generate JWT token and compare password
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { email: user.email, id: user._id, accountType: user.accountType },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      // save token to user document in database : it has a reason
      user.token = token;
      user.password = undefined;

      //set cookie for a token and return success response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User login successfully",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Login failure Please try Again",
    });
  }
};

// Send OTP For Email Verification
exports.sendotp = async (req, res) => {
  try {
    //fetch data
    const { email } = req.body;

    // Find user with provided email
    const checkUserPresent = await User.findOne({ email });
    // to be used in case of signup

    // If user found with provided email
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: `User is Already Registered`,
      });
    }

    // Generate OTP
    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // Ensure Unique OTP
    const result = await OTP.findOne({ otp: otp });
    console.log("Result is Generate OTP Func");
    console.log("OTP", otp);
    console.log("Result", result);
    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
      });
    }

    // Create OTP Payload and Save to Database
    const otpPayload = { email, otp };
    const otpBody = await OTP.create(otpPayload);
    console.log("OTP Body", otpBody);
    res.status(200).json({
      success: true,
      message: `OTP Sent Successfully`,
      otp,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// controller for changing Password
exports.changePassword = async (req, res) => {
  try {
    // Get user data from req.User
    const userDetails = await User.findById(req.user.id);

    // Get old password, new password, and confirm new password from req.body
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // validation of old password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    );
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "The password is incorrect",
      });
    }
    // match new password and confirm new password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "new password and confirm new password does not match",
      });
    }
    // update new password in DB
    const encryptedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: encryptedPassword },
      { new: true }
    );
    // send notification of updated password
    try {
      const emailResponse = await mailSender(
        updatedUserDetails.email,
        passwordUpdated(
          updatedUserDetails.email,
          `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
      );
      console.log("Email sent successfully:", emailResponse.response);
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error);
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      });
    }

    // Return success response
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error occured while updating password", error);
    return res.status(500).json({
      success: false,
      message: "Error occured while updating password",
      error: error.message,
    });
  }
};