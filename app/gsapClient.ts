let gsapLoader: ReturnType<typeof createGsapLoader> | undefined;

function createGsapLoader() {
  return Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("gsap/CustomEase"),
  ]).then(([gsapModule, scrollTriggerModule, customEaseModule]) => {
    const gsap = gsapModule.gsap;
    const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
    const CustomEase = customEaseModule.CustomEase;

    gsap.registerPlugin(ScrollTrigger, CustomEase);
    CustomEase.create("flovroEase", "M0,0 C0.16,1 0.3,1 1,1");

    return { gsap, ScrollTrigger };
  });
}

export function loadGsap() {
  gsapLoader ??= createGsapLoader();
  return gsapLoader;
}
