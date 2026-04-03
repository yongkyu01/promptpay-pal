import confetti from "canvas-confetti";

export function fireConfetti() {
  const colors = ["#7c3aed", "#a78bfa", "#c084fc", "#FACC15", "#22C55E"];
  
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    shapes: ["circle", "square"],
    scalar: 1.2,
  });

  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { y: 0.5, x: 0.3 },
      colors,
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { y: 0.5, x: 0.7 },
      colors,
    });
  }, 400);
}
