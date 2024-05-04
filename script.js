document.addEventListener("DOMContentLoaded", function() {
    // Animation for the proposal message
    const proposalMessage = document.querySelector(".proposal-message");
    proposalMessage.style.opacity = 0;
    proposalMessage.style.transform = "translateY(20px)";
    setTimeout(() => {
        proposalMessage.style.opacity = 1;
        proposalMessage.style.transform = "translateY(0)";
    }, 500);

    // Animation for the images
    const leftImage = document.querySelector(".left-image");
    const rightImage = document.querySelector(".right-image");
    leftImage.style.opacity = 0;
    rightImage.style.opacity = 0;
    leftImage.style.transform = "translateX(-20px)";
    rightImage.style.transform = "translateX(20px)";
    setTimeout(() => {
        leftImage.style.opacity = 1;
        rightImage.style.opacity = 1;
        leftImage.style.transform = "translateX(0)";
        rightImage.style.transform = "translateX(0)";
    }, 1000);
});
