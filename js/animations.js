function initAnimations(){

  if(typeof gsap === "undefined") return;

  gsap.to(".topbar h1", {
    "--shine": "200%",
    duration: 8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

}