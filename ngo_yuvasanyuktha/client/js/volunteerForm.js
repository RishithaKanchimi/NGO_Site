
emailjs.init("zvKGEDj_Azf6ddsx2");
document.getElementById("form-volunteer").addEventListener("submit", function (event) {
event.preventDefault();

const name = document.getElementById("name").value;
const email = document.getElementById("email").value;
const messageElement = document.getElementById("message");

const message1 = messageElement.value.trim() || "NA";

// Check if any of the form fields are empty
if (!name || !email) {
    alert("Please fill in all form fields.");
    return; // Do not send the email if fields are empty
}

const message = `Name: ${name}\nEmail: ${email}\nMessage: ${message1}`;

// Use Email.js to send the email
emailjs.send("service_y2mbzc4", "template_kmlq2o6", {
    message: message,
})
.then(function(response) {
    // Email sent successfully
    document.getElementById("successModal").style.display = "block";
}, function(error) {
    // Email sending failed
    console.error('Error:', error);
});
});