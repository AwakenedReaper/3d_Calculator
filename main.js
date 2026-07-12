document.addEventListener('DOMContentLoaded', () => {
    // ─── Hardcoded Base Rates ─────────────────────────────────────────────────
    // To update rates: edit these values and push to GitHub.
    const RATES = {
        maint: 20,    // Maintenance rate (₱/hr)
        life: 5,     // Machine lifetime/depreciation (₱/hr)
        elec: 20,    // Electricity (₱/hr)
        fil: 1,     // Filament cost (₱/g)
        post: 50,    // Post-production labour (₱/hr)
        prep: 30,    // Print prep labour (₱/hr)
        design: 150,   // Design/modelling labour (₱/hr)
        fail: 10,    // Failure buffer (₱ flat)
        pkg: 15,    // Packaging (₱ flat)
        ship: 0,   // Shipment (₱ flat)
        markup: 1.5,   // Profit markup multiplier
    };

    // ─── DOM Elements ─────────────────────────────────────────────────────────
    const viewToggle = document.getElementById('view-toggle');
    const simpleFormula = document.getElementById('simple-formula');
    const expandedFormula = document.getElementById('expanded-formula');
    const toggleLabels = document.querySelectorAll('.toggle-label');

    const detailsPanel = document.getElementById('details-panel');
    const closeDetailsBtn = document.querySelector('.close-details-btn');
    const detailsTitle = document.getElementById('details-title');
    const detailsDesc = document.getElementById('details-description');
    const detailsFormula = document.getElementById('details-formula');
    const detailsBody = document.getElementById('details-body');
    const overlay = document.getElementById('panel-overlay');
    const totalPriceEl = document.getElementById('total-price');

    // ─── Job Parameter Inputs ─────────────────────────────────────────────────
    const inputs = {
        printHours: document.getElementById('print-hours'),
        filamentUsed: document.getElementById('filament-used'),
        prepTime: document.getElementById('prep-time'),
        postTime: document.getElementById('post-time'),
        designTime: document.getElementById('design-time'),
    };

    // ─── Formatting Utility ───────────────────────────────────────────────────
    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

    // ─── XSS-Safe Detail-Row Builder ─────────────────────────────────────────
    const buildDetailRows = (dataArray) => {
        detailsBody.innerHTML = '';
        dataArray.forEach(item => {
            const row = document.createElement('div');
            row.className = 'detail-row';
            const label = document.createElement('span');
            label.textContent = item.label;
            const value = document.createElement('strong');
            value.textContent = item.val;
            row.appendChild(label);
            row.appendChild(value);
            detailsBody.appendChild(row);
        });
    };

    // ─── Calculate and Update UI ──────────────────────────────────────────────
    const calculate = () => {
        // Job params
        const ph = parseFloat(inputs.printHours.value) || 0;
        const filU = parseFloat(inputs.filamentUsed.value) || 0;
        const pt = parseFloat(inputs.prepTime.value) || 0;
        const postT = parseFloat(inputs.postTime.value) || 0;
        const dt = parseFloat(inputs.designTime.value) || 0;

        // Expanded costs
        const expMaint = RATES.maint * ph;
        const expLife = RATES.life * ph;
        const expElec = RATES.elec * ph;
        const expFil = RATES.fil * filU;
        const expPost = RATES.post * postT;
        const expPrep = RATES.prep * pt;
        const expDesign = RATES.design * dt;

        const markedUpCost = (expMaint + expFil + expLife + expElec + expPost) * RATES.markup;
        const nonMarkedUpCost = RATES.fail + RATES.pkg + RATES.ship + expPrep + expDesign;
        const totalExpanded = markedUpCost + nonMarkedUpCost;

        // Update expanded view
        document.getElementById('val-exp-maint').textContent = formatCurrency(expMaint);
        document.getElementById('val-exp-life').textContent = formatCurrency(expLife);
        document.getElementById('val-exp-elec').textContent = formatCurrency(expElec);
        document.getElementById('val-exp-fil').textContent = formatCurrency(expFil);
        document.getElementById('val-exp-post').textContent = formatCurrency(expPost);
        document.getElementById('val-exp-markup').textContent = RATES.markup + 'x';
        document.getElementById('val-exp-fail').textContent = formatCurrency(RATES.fail);
        document.getElementById('val-exp-pkg').textContent = formatCurrency(RATES.pkg);
        document.getElementById('val-exp-ship').textContent = formatCurrency(RATES.ship);
        document.getElementById('val-exp-prep').textContent = formatCurrency(expPrep);
        document.getElementById('val-exp-design').textContent = formatCurrency(expDesign);

        // Simple view totals
        const simpleMaterial = expFil;
        const simpleMachine = expMaint + expLife + expElec;
        const simplePost = expPost;
        const simpleServices = expPrep + expDesign + RATES.fail + RATES.pkg + RATES.ship;

        document.getElementById('val-simple-material').textContent = formatCurrency(simpleMaterial);
        document.getElementById('val-simple-machine').textContent = formatCurrency(simpleMachine);
        document.getElementById('val-simple-post').textContent = formatCurrency(simplePost);
        document.getElementById('val-simple-markup').textContent = RATES.markup + 'x';
        document.getElementById('val-simple-services').textContent = formatCurrency(simpleServices);

        totalPriceEl.textContent = formatCurrency(totalExpanded);

        // Breakdown store for details panel
        window.currentBreakdown = {
            'material-details': {
                title: 'Material Cost',
                desc: 'Covers the plastic filament used for the prints.',
                formula: 'Filament Cost (₱/g) × Filament Used (g)',
                data: [
                    { label: 'Filament Rate', val: formatCurrency(RATES.fil) + '/g' },
                    { label: 'Amount Used', val: filU + 'g' },
                    { label: 'Total', val: formatCurrency(simpleMaterial) },
                ],
            },
            'machine-details': {
                title: 'Machine Cost',
                desc: 'Covers the cost of running the machine, including maintenance, depreciation, and electricity.',
                formula: '(Maintenance + Lifetime + Electricity) × Print Hours',
                data: [
                    { label: 'Combined Hourly Rate', val: formatCurrency(RATES.maint + RATES.life + RATES.elec) + '/hr' },
                    { label: 'Print Hours', val: ph + ' hrs' },
                    { label: 'Total', val: formatCurrency(simpleMachine) },
                ],
            },
            'post-details': {
                title: 'Post Production',
                desc: 'The cost for post-processing the print, such as support removal, sanding, or painting.',
                formula: 'Post-Production Rate (₱/hr) × Time Spent',
                data: [
                    { label: 'Post-Prod Rate', val: formatCurrency(RATES.post) + '/hr' },
                    { label: 'Hours', val: postT + ' hrs' },
                    { label: 'Total', val: formatCurrency(simplePost) },
                ],
            },
            'markup-details': {
                title: 'Markup Multiplier',
                desc: 'Applied to materials, machine runtime, and post-processing to cover business overhead, taxes, and profit margin.',
                formula: 'Markup × (Material + Machine + Post)',
                data: [
                    { label: 'Multiplier', val: RATES.markup + 'x' },
                ],
            },
            'services-details': {
                title: 'Service & Delivery',
                desc: 'Flat fees and direct service charges that are not subject to the markup multiplier.',
                formula: 'Design + Prep + Failure Buffer + Packaging + Shipping',
                data: [
                    { label: 'Design Cost', val: formatCurrency(expDesign) },
                    { label: 'Print Prep', val: formatCurrency(expPrep) },
                    { label: 'Failure Buffer', val: formatCurrency(RATES.fail) },
                    { label: 'Delivery/Shipping', val: formatCurrency(RATES.pkg + RATES.ship) },
                    { label: 'Total', val: formatCurrency(simpleServices) },
                ],
            },
            'exp-maint': {
                title: 'Maintenance Cost',
                desc: 'Covers wear and tear items like nozzles, belts, and regular machine upkeep.',
                formula: 'Maintenance Rate × Print Hours',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.maint) + '/hr' },
                    { label: 'Hours', val: ph + ' hrs' },
                    { label: 'Total', val: formatCurrency(expMaint) },
                ],
            },
            'exp-life': {
                title: 'Machine Lifetime Depreciation',
                desc: 'Recoups the initial cost of the 3D printer over its expected operational lifespan.',
                formula: 'Lifetime Rate × Print Hours',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.life) + '/hr' },
                    { label: 'Hours', val: ph + ' hrs' },
                    { label: 'Total', val: formatCurrency(expLife) },
                ],
            },
            'exp-elec': {
                title: 'Electricity Cost',
                desc: 'The estimated power consumption cost of running the printer and heated bed.',
                formula: 'Electricity Rate × Print Hours',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.elec) + '/hr' },
                    { label: 'Hours', val: ph + ' hrs' },
                    { label: 'Total', val: formatCurrency(expElec) },
                ],
            },
            'exp-fil': {
                title: 'Filament Cost',
                desc: 'Direct cost of the raw plastic used.',
                formula: 'Filament Rate × Filament Used',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.fil) + '/g' },
                    { label: 'Used', val: filU + 'g' },
                    { label: 'Total', val: formatCurrency(expFil) },
                ],
            },
            'exp-post': {
                title: 'Post-Production',
                desc: 'Labor cost for cleaning up the final print.',
                formula: 'Post-Prod Rate × Hours',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.post) + '/hr' },
                    { label: 'Hours', val: postT + ' hrs' },
                    { label: 'Total', val: formatCurrency(expPost) },
                ],
            },
            'exp-fail': {
                title: 'Failure Buffer',
                desc: 'A flat fee added to absorb the cost of occasional failed prints.',
                formula: 'Flat Failure Rate',
                data: [{ label: 'Cost', val: formatCurrency(RATES.fail) }],
            },
            'exp-pkg': {
                title: 'Packaging',
                desc: 'Cost of boxes, bubble wrap, and other packing materials.',
                formula: 'Flat Packaging Cost',
                data: [{ label: 'Cost', val: formatCurrency(RATES.pkg) }],
            },
            'exp-ship': {
                title: 'Shipment',
                desc: 'Cost of postage and courier services.',
                formula: 'Flat Shipping Cost',
                data: [{ label: 'Cost', val: formatCurrency(RATES.ship) }],
            },
            'exp-prep': {
                title: 'Print Preparation',
                desc: 'Labor time spent slicing the model and setting up the printer.',
                formula: 'Prep Rate × Prep Hours',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.prep) + '/hr' },
                    { label: 'Hours', val: pt + ' hrs' },
                    { label: 'Total', val: formatCurrency(expPrep) },
                ],
            },
            'exp-design': {
                title: 'Design Time',
                desc: 'Labor cost for 3D modeling or modifying the part.',
                formula: 'Design Rate × Design Hours',
                data: [
                    { label: 'Rate', val: formatCurrency(RATES.design) + '/hr' },
                    { label: 'Hours', val: dt + ' hrs' },
                    { label: 'Total', val: formatCurrency(expDesign) },
                ],
            },
        };
    };

    // ─── Input Listeners ──────────────────────────────────────────────────────
    Object.values(inputs).forEach(input => input.addEventListener('input', calculate));

    // ─── View Toggle ──────────────────────────────────────────────────────────
    viewToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            simpleFormula.classList.remove('active');
            expandedFormula.classList.add('active');
            toggleLabels[0].classList.remove('active');
            toggleLabels[1].classList.add('active');
        } else {
            expandedFormula.classList.remove('active');
            simpleFormula.classList.add('active');
            toggleLabels[1].classList.remove('active');
            toggleLabels[0].classList.add('active');
        }
    });

    // ─── Details Panel ────────────────────────────────────────────────────────
    const closeAllPanels = () => {
        detailsPanel.classList.remove('open');
        overlay.classList.remove('active');
    };

    const openDetails = (target) => {
        const dataObj = window.currentBreakdown[target];
        if (!dataObj) return;

        detailsTitle.textContent = dataObj.title;
        detailsDesc.textContent = dataObj.desc;
        detailsFormula.textContent = dataObj.formula;
        buildDetailRows(dataObj.data);

        detailsPanel.classList.add('open');
        overlay.classList.add('active');
    };

    closeDetailsBtn.addEventListener('click', closeAllPanels);
    overlay.addEventListener('click', closeAllPanels);

    document.querySelectorAll('.formula-block').forEach(block => {
        block.addEventListener('click', () => {
            const target = block.getAttribute('data-target');
            if (target) openDetails(target);
        });
    });

    // ─── Theme Logic ──────────────────────────────────────────────────────────
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    const sunIcon = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeIcon.innerHTML = currentTheme === 'dark' ? sunIcon : moonIcon;

    themeToggleBtn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeIcon.innerHTML = next === 'dark' ? sunIcon : moonIcon;
    });

    // ─── Boot ─────────────────────────────────────────────────────────────────
    calculate();
    toggleLabels[0].classList.add('active');
});
