const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");

const { validationResult } = require("express-validator");

const User = require("../models/user");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: `${process.env.SENDGRID_KEY}`,
    },
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    },

    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    // isAuthenticated: false,
    // csrfToken:req.csrfToken(),
    oldInput: {
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    },

    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // console.log(errors,"errorsObject");
    // console.log(errors.array(), "errorsObject Arr");
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      // isAuthenticated: false,
      // csrfToken:req.csrfToken(),
      oldInput: {
        email,
        password,
        name,
      },

      validationErrors: errors.array(),
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password",
          // isAuthenticated: false,
          // csrfToken:req.csrfToken(),
          oldInput: {
            email,
            password,
            name,
          },

          validationErrors: [],
        });
      }

      return bcrypt
        .compare(password, user.password)
        .then((isCorrect) => {
          if (isCorrect) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              if (err) {
                console.log(err);
              }
              res.redirect("/");
              const loginOptions = {
                from: "miraacle64@gmail.com",
                to: email,

                subject: `You've just logged in ${name} ✨⚡🚀.`,
                html: `
              <h3>You've just logged in to your shop-node-learn account</h3>
              <p>Please if this isn't done by you,you can let us know contacting support.</p>
              `,
              };
              transporter.sendMail(loginOptions);
            });
          }

          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid email or password",
            oldInput: {
              email,
              password,
              name,
            },
            validationErrors: [],
          });
        })
        .catch((err) => {
          if (err) {
            console.log(err);
            res.redirect("/login");
          }
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // console.log(errors,"errorsObject");
    // console.log(errors.array(), "errorsObject Arr");
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      // isAuthenticated: false,
      // csrfToken:req.csrfToken(),
      oldInput: {
        email,
        password,
        name,
        confirmPassword,
      },

      validationErrors: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        name: name,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then(() => {
      const mailOptions = {
        from: "miraacle64@gmail.com",
        to: email,
        subject: `Your node-learn shop sign succeeded!✨⚡, ${name}`,
        html: `<h1>You've successfully signed up! ${name}</h1>`,
      };
      // console.log("sign up message mailOptions", mailOptions);

      res.redirect("/login");
      return transporter.sendMail(mailOptions);
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  const email = req.body.email;
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      // console.log("error: crypto err", err);
      return res.redirect("/reset");
    }

    const token = buffer.toString("hex");
    // console.log(token, "token crypto");
    User.findOne({ email: email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");

        const host = req.headers.host;
        const protocol = req.protocol;
        const link = `${protocol}://${host}/reset/${token}`;
 

        const resetOptions = {
          from: "miraacle64@gmail.com",
          to: email,
          subject: `Password reset`,
          text: `You've requested a password reset`,
          html: `
        <h3>You requested a password reset</h3>
        <p>Click this <a href="${link}">Link</a> to set a new password and this link expires after one hour</p>
        `,
        };
        transporter.sendMail(resetOptions);
        // console.log("reset options", resetOptions);
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;

  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }

      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const confirmNewPassword = req.body.confirmPassword;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    _id: userId,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.compare(newPassword, confirmNewPassword);
    })
    .then((isCorrect) => {
      if (isCorrect === true) {
        return bcrypt.hash(newPassword, 12);
      } else {
        req.flash("error", "The passwords you enter are not the same.");

        return res.redirect("/reset");
      }
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(() => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
