//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');
const mailer = require(__dirname+'/module/mail')

const app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
    secret : "this is my first cookies",
    resave: false,
    saveUninitialized: false 
}))

app.use(passport.initialize());
app.use(passport.session())
let net = "mongodb+srv://etineh:etineh@eventapp.axc5h4p.mongodb.net"
mongoose.connect(`${net}/keeperDB`, {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    googleId: String,
    submit: String,
    facebookId: String,
    forgetCode: String
})

//plugin comes below Schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const UserModel = mongoose.model("User", userSchema);  

const secretSchema = new mongoose.Schema ({
    userId: String,
    secret: String
})
const SecretModel = mongoose.model("Secret", secretSchema)

//serializeUser comes below Model
passport.use(UserModel.createStrategy());
passport.serializeUser((user, done)=> {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    UserModel.findById(id, (err, user)=>{
        done(err, user);
    });
});

  //google login setup //
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALL_URL, 
    userProfileURL: process.env.USER_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    UserModel.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//facebook login setup
// passport.use(new FacebookStrategy({
//     clientID: process.env.APP_ID,
//     clientSecret: process.env.FACEBOOK_APP_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     UserModel.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));  

//////////////////// global variables ///////////////
let passwordStatus = "", forgetPass = "", inpType="email", check = 0, inpHolder="email address"
let hid = "hidden", fCheck = 0

app.get("/", (req, res)=>{
    check = 0, fCheck = 0
    if(req.isAuthenticated()){
        res.redirect("/keeper")
    }else{
        res.render("home");
    }  
});

///////////////Google login
app.get("/auth/google",
    passport.authenticate('google', {scope: ['profile']})
)

app.get("/auth/google/keeper", 
  passport.authenticate('google', { failureRedirect: '/login' }), (req, res)=> {
    // Successful authentication, redirect home.
    res.redirect('/keeper');
  });

  ///////////facebook login
// app.get('/auth/facebook',
//     passport.authenticate('facebook', {scope: ['user_profile']}));

// app.get('/auth/facebook/keeper',
//   passport.authenticate('facebook', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/keeper');
//   });

app.get("/keeper", (req, res)=>{

    if(req.isAuthenticated()){
        SecretModel.find({"userId":req.user.id}, (err, seen)=>{
            if(err){
                console.log(err)
            } else {
            res.render("keeper", {display: seen})
            }
        })
    } else{
        res.redirect("/login")
    }
})

app.get("/submit", (req, res)=>{
    if(req.isAuthenticated()){
        res.render("submit")
    } else{
        res.redirect("/login")
    }
})

app.post("/submit", (req, res)=>{
    const newSubmit = new SecretModel ({
        userId : req.user.id,
        secret : req.body.secret
    })

    newSubmit.save((err)=>{
        if(err){
            console.log(err)
        } else{
            res.redirect("/keeper")
        }
    })
})

////////////////     registration      //////////////////
app.get("/register", (req, res)=>{
    res.render("register");
});
app.post("/register", (req, res)=>{
    UserModel.register({username: req.body.username}, req.body.password, (err)=>{
        if(err){
            res.render("login", {loginPage: "Email already exist! Kindly login..."});
            console.log(err)
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/keeper")
                // res.render("login", {loginPage: "Registration sucessful. Login here!"});
            })
        }
    })
})

//////////////    login    //////////////////
app.get("/login", (req, res)=>{
    res.render("login", {loginPage: ""});
});
app.post("/login", (req, res)=>{
    // const newUser = new UserModel
    req.login(new UserModel, (err)=>{
        if(err){
            res.send("Error. Make sure email and password matches")
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/keeper")
            })
        }
    })
})

//////////////////   delete     ///////////////////////////////
app.post("/delete", (req, res)=>{
    const del = req.body.del
    SecretModel.findByIdAndDelete(del, (err)=>{
        err? console.log(err): res.redirect("/keeper")
    })
})

///////////////////////// forget password ///////////////////////
app.get("/forgetPassword", (req, res)=>{
        if(check){
            res.render("forgetPassword", {forgetPass, inpType, inpHolder, hid})
        } else{
            forgetPass = "", inpType="email", inpHolder="email address", hid="hidden"
            res.render("forgetPassword", {forgetPass, inpType, inpHolder, hid})
        }
})

app.post("/forgetPassword", (req, res)=>{
    let access = req.body.username, newPass = req.body.newPass, confirmPass = req.body.confirmPass;
    if(!fCheck){
        UserModel.findOne({username:access}, (err, seen)=>{
            if(seen === null){
                forgetPass = "Email not found, enter valid email address."
                res.redirect("/forgetPassword")
            } else{
                const randomCode = Math.floor((Math.random()+1) * process.env.CODE)
                forgetPass = "enter the code sent to your mail and enter new password"; 
                inpType="number", inpHolder="enter code", hid = "password"; 
                seen.forgetCode = randomCode;
                seen.save(err=>{
                    if(!err){
                        mailer.mailCode(randomCode, seen.username);
                        res.redirect("/forgetPassword");
                        fCheck = 1
                    }
                });
            }
        })
        check = 1
    } else{
        UserModel.findOne({forgetCode:access}, (err, seenCode)=>{
            inpType="number", hid = "password", inpHolder="enter code";
            if(seenCode == null){
                forgetPass = "Invalid code. Re-enter correct code.";
                res.redirect("/forgetPassword");
                console.log("Invalid code from email");
            } else{
                if(newPass === confirmPass){
                    seenCode.setPassword(newPass, (err)=>{
                        if(!err){
                            seenCode.save(err=>{
                                if(!err){
                                    forgetPass = "", inpType="email", inpHolder="email address", hid="hidden";
                                    res.render("login", {loginPage: "Password reset. Login"});
                                    check = 0;
                                }
                            })
                        }
                    })
                } else {
                    forgetPass = "passwords do not match"
                    res.redirect("/forgetPassword")
                }
            }
        })
    }    
})

///////////////////////// change password ///////////////////////
app.get("/changePassword", (req, res)=>{
    res.render("changePassword", {passwordStatus})
})

app.post("/changePassword", (req, res)=>{
    if(req.isAuthenticated()){
        let old = req.body.old, newP = req.body.new, conP = req.body.conf
        UserModel.findById(req.user.id, (err, seen)=>{
            if(newP === conP) {
                seen.changePassword(old, newP, (err)=>{
                    if(err){
                        passwordStatus = "old password incorrect"
                        res.redirect("/changePassword")
                    } else {
                        passwordStatus = "password successfully change."
                        res.redirect("/changePassword")
                    }
                })
            } else {
                passwordStatus = "password don't match."
                res.redirect("/changePassword")
            }
        })
    } else {
        res.redirect("/login")
    }
})

//////////// logout ////////////////////////
app.get("/logout", (req, res)=>{
    req.logOut((err)=>{
        if(!err){
            res.redirect("/");
        }
    });
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 4000;
}
app.listen(port, ()=>{
    console.log("Hello! I am running on port 4000");
});