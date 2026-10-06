require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { checkAndIssueCertificate } = require("../controllers/certificates.controller");

const traineeId = Number(process.argv[2]);
const courseId = Number(process.argv[3]);

checkAndIssueCertificate(traineeId, courseId)
  .then((cert) => {
    console.log("Result:", cert);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
