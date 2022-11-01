//jshint esversion:6
const nodemailer = require('nodemailer')

// exports.randomNum= ()=>{
//     const randomNum1 = Math.floor((Math.random()+1) * 47388)
//     return randomNum1
// }

exports.mailCode = (randomCode, seen)=>{
    // const randomCode = Math.floor((Math.random()+1) * 47388)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.USER,
          pass: process.env.PASS
        }
      });
    const mailOptions = {
        from: 'etine4real@gmail.com',
        to: seen,
        subject: 'forget password code',
        html: `<h1 style="color:red">Welcome</h1><p>That was easy!</p>
                <p> Here is your code ${randomCode} </p>`
      };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
    });
}

// console.log(this.mailCode)