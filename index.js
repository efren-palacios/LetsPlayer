var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const session = require("express-session");
var passport = require("passport");
var twitchStrategy = require("passport-twitch").Strategy;
var express = require("express");
var path = require("path");
var robot = require("robotjs");
var config = require("./config");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "iwanttoplaysomegames",
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(express.static("./public"));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

const db = {};

passport.use(
  new twitchStrategy(
    {
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope
    },
    function(accessToken, refreshToken, profile, done) {
      db[profile.id] = profile;

      process.nextTick(function() {
        return done(null, profile);
      });
    }
  )
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  done(null, db[id]);
});

app.use(express.static(path.join(__dirname, "views")));
app.set("view engine", "ejs");

app.get(
  "/auth/twitch/callback",
  passport.authenticate("twitch", {
    failureRedirect: "/error"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/member");
  }
);

app.get("/member", checkAuth, function(req, res) {
  res.render("member", { user: req.user });
});

app.get("/login", passport.authenticate("twitch"), function(req, res) {});

const keymap = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  a: "v",
  b: "c",
  y: "x",
  x: "d",
  start: "space",
  select: "enter",
  l: "a",
  r: "s"
};

io.on("connection", function(socket) {
  Object.keys(keymap).forEach(wsKey => {
    socket.on(wsKey, msg => {
      robot.keyToggle(keymap[wsKey], "down");
    });
  });
  Object.keys(keymap).forEach(wsKey => {
    socket.on(`r${wsKey}`, msg => {
      robot.keyToggle(keymap[wsKey], "up");
    });
  });
});

app.get("/", function(req, res) {
  res.redirect("/login");
});

http.listen(3000, function() {
  console.log("listening on port 3000");
});

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/");
}
