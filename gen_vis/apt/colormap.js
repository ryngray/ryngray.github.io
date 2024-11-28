// colormap.js
export const colormap = d3.scaleOrdinal()
    .domain( ['Ratification of the UN Convention against Torture ', 'Ratification of Optional Protocol (OPCAT)', 'Submission of initial report to CAT ', 'Prohibition of torture in the constitution ', 'Criminalisation of torture under domestic law', 'Designation of the National Preventive Mechanism (in law) ','Operationality of the National Preventive Mechanism ', 'Existence of National Human Rights Institution that fully complies with Paris Principles']) // Define your categories
    .range(["#e06058", "#fd62a5", "#ff883b", "#9fc476", "#2a9372", "#91c3e0", "#285391", "#8755aa"])
    // .range(["#bc985b", "#285391", "#ff8637", "#e36360", "#2a9372", "#b0b0b0", "#b04bb0", "#8cb5f0"]);        // Define your color scheme
