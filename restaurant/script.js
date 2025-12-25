document.addEventListener('DOMContentLoaded', () => {
  // 1. Scroll Reveal Animation
  const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Only trigger once
      }
    });
  }, observerOptions);

  const revealElements = document.querySelectorAll('.scroll-reveal');
  revealElements.forEach(el => observer.observe(el));

  // 2. Navbar Scroll Effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 3. Mouse Follow Glow (Optional but adds Sylexify vibe)
  const glow = document.querySelector('.cursor-glow');
  if (glow) {
    document.addEventListener('mousemove', (e) => {
      const x = e.clientX;
      const y = e.clientY;
      glow.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }
});
