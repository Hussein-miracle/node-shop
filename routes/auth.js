const express = require("express");
const bcrypt = require("bcryptjs");
const { body } = require("express-validator");

// const { body } = expressValidator;

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),

    body("password", "Password has to be valid")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Invalid email input.")
      .custom((value, options) => {
        // console.log(options, "options");¿
        // const { req } = options;

        return User.findOne({ email: value }).then((user) => {
          if (user) {
            return Promise.reject(
              "E-mail already exists please login with that."
            );
          }
        });
      })
      .normalizeEmail(),

    body(
      "password",
      "Please enter a password with at least 5 characters with only number and text"
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),

    body("confirmPassword").custom((val, { req }) => {
      if (val !== req.body.password) {
        throw new Error("Passwords have to match!");
      }

      return true;
    }),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);
router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);

module.exports = router;
