const express = require("express");
const kafka = require('./../kafka/client');
const { APPLY_FOR_JOB_REQUEST, APPLY_FOR_JOB_RESPONSE } = require('./../kafka/topics');
const { responseHandler, sendInternalServerError, sendBadRequest } = require('./response');
const router = express.Router();

const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './resumes_and_coverletter');
    },
    filename: (req, file, callback) => {
        fileExtension = file.originalname.split('.')[1] // get file extension from original file
        callback(null, file.originalname.split('.')[0] + '-' + Date.now() + '.' + fileExtension);
    },
});
var upload = multer({ storage: storage })

router.post("/", upload.any(), function (req, res) {
    console.log("Inside apply for job controller");
    console.log("APPLY FOR JOB: ", req.body);

    var resumename;
    var coverlettername;

    console.log("Files - ", req.files)
    if (req.files.length == 1) {
        resumename = req.files[0].filename;
        console.log("resumename", resumename);
    }
    if (req.files.length > 1) {
        resumename = req.files[0].filename;
        console.log("resumename", resumename);
        coverlettername = req.files[1].filename;
        console.log("coverlettername", coverlettername);
    }


    const data = {
        body: req.body,
        resumeName: resumename,
        coverletterName: coverlettername
    }

    let errors = validateInput(req);
    if (errors) {
        let msg = errors.map(error => error.msg).reduce((accumulator, currentVal) => accumulator + "\n" + currentVal);
        sendBadRequest(res, {
            detail: msg
        });
    }
    else {
        kafka.make_request(APPLY_FOR_JOB_REQUEST, APPLY_FOR_JOB_RESPONSE, data, function (err, result) {
            if (err) {
                // called in case of time out error, or if we failed to send data over kafka
                sendInternalServerError(res);
            } else {
                responseHandler(res, result);
            }
        });
    }
});


/**
 * 
 * returns false if there is no validation error, otherwise returns array of error messages.
 * for more detail on handling error with express-validator check https://github.com/chriso/validator.js/
 *  
 * @param {object} req - express request object 
 */

function validateInput(req) {
    req.checkBody("firstName", "First Name is required.").notEmpty();
    req.checkBody("lastName", "Last Name is required.").notEmpty();
    req.checkBody("applicantEmail", "Applicant Email is required.").notEmpty();
    req.checkBody("phoneNumber", "Applicant Phone Number is required.").notEmpty();
    req.checkBody("address", "Address is required.").notEmpty();
    // req.checkBody("password", "Your Password must contain at least 1 number and 1 letter. \n Your Password must be between 7 and 32 characters.").matches(/^(?=.*\d)(?=.*[a-zA-Z]).{7,32}$/);

    //add more validation if needed.
    return req.validationErrors();
}

module.exports = router;