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
function animateSuggestedWorkout(){

  if(typeof gsap === "undefined") return;

  const btn=document.querySelector(".home-suggested-btn");

  if(!btn) return;


  btn.classList.add("glow");


  gsap.from(btn,{
    opacity:0,
    y:20,
    scale:.95,
    duration:.7,
    ease:"back.out(1.7)"
  });

}

function animateSuggestedGlow(){

  if(typeof gsap === "undefined") return;

  gsap.to(".home-suggested-btn::before", {
    opacity:0.5,
    duration:2,
    repeat:-1,
    yoyo:true,
    ease:"sine.inOut"
  });

}