const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// resetPasswordToken Controller
exports.resetPasswordToken = async (req, res) => {
  try {
    const email = req.body.email;

    // Find user with provided email
    const user = await User.findOne({ email: email });

    // If user is not found, return a response indicating the email is not registered
    if (!user) {
      return res.json({
        success: false,
        message: `This Email: ${email} is not Registered With Us. Enter a Valid Email`,
      });
    }

    // generate a random reset token
    const token = crypto.randomBytes(20).toString("hex");
    // Update the user's details with the generated token and set an expiration time for the token (1 hour from now)
    const updatedDetails = await User.findByIdAndUpdate(
      { email: email },
      { token: token, resetPasswordExpires: Date.now() + 3600000 },
      { new: true }
    );

    // Log the updated user details to the console
    console.log("DETAILS", updatedDetails);

    // Create a URL for resetting the password, including the generated token
    const url = `http://localhost:3000/update-password/${token}`;

    // Send an email to the user with the reset link
    await mailSender(
      email,
      "Password Reset",
      `Your link for email verification is ${url}. Please click this URL to reset your password.`
    );

    // Send a success response indicating the email was sent successfully
    res.json({
      success: true,
      message:
        "Email Sent Successfully. Please Check Your Email to Continue Further",
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: `Some Error Occurred in Sending the Reset Message`,
    });
  }
};

// resetPassword Controller
exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body;

    if (confirmPassword !== password) {
      return res.json({
        success: false,
        message: "Password and Confirm Password Does not Match",
      });
    }
    const userDetails = await User.findOne({ token: token });
    if (!userDetails) {
      return res.json({
        success: false,
        message: "Token is Invalid",
      });
    }
    if (!(userDetails.resetPasswordExpires > Date.now())) {
      return res.status(403).json({
        success: false,
        message: `Token is Expired, Please Regenerate Your Token`,
      });
    }
    const encryptedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { token: token },
      { password: encryptedPassword },
      { new: true }
    );
    res.json({
      success: true,
      message: `Password Reset Successful`,
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: `Some Error in Updating the Password`,
    });
  }
};
