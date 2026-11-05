// Tag the page with its top-level section (terraform, kubernetes, azure, numpy, pandas)
// so CSS can apply a per-tool accent colour. Re-runs on instant navigation.
function mldSetSection() {
  var known = ["terraform", "kubernetes", "azure", "numpy", "pandas"];
  var parts = window.location.pathname.split("/").filter(Boolean);
  var section = "home";
  for (var i = 0; i < parts.length; i++) {
    if (known.indexOf(parts[i]) !== -1) { section = parts[i]; break; }
  }
  document.body.setAttribute("data-section", section);
}

if (typeof document$ !== "undefined") {
  document$.subscribe(mldSetSection);   // Material's instant-navigation observable
} else {
  document.addEventListener("DOMContentLoaded", mldSetSection);
}
