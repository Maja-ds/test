
        $(document).ready(function () {

            /* =========================
🔄 LOADING OVERLAY
========================= */

            function showLoading() {
                $('#loadingOverlay').addClass('show').show();
            }

            function hideLoading() {
                $('#loadingOverlay').removeClass('show');
                // Nach Animation ausblenden
                setTimeout(() => { $('#loadingOverlay').hide(); }, 300); // 300ms = Dauer der Transition
            }

            /* =========================
🧩 HILFSFUNKTIONEN
========================= */
            // Zerlegt kommaseparierte Werte in ein Array
            function splitValues(value) {
                if (!value) return [];
                return value.split(',').map(v => v.trim());
            }
            const religionMapping = {
                "Jüdisch": ["jüdisch"],
                "Christlich": ["christlich"],
                "Freikirchen": ["freikirchen"],
                "Andere": ["andere"],
                "Konfessionslos": ["konfessionslos"],
                "k.A.": ["k.a."]
            };

            /* =========================
📊 DATATABLE INITIALISIERUNG
========================= */

            let table = $('#demo').DataTable({
                data: daten,
                pageLength: 10,
                order: [[0, 'asc']], 
                orderCellsTop: true,
                mark: true,
                language: {
                    lengthMenu: "_MENU_  Einträge pro Seite",
                    paginate: {
                        previous: "«",
                        next: "»"
                    }
                },
                autoWidth: false,
                dom: "<'row'<'col-sm-4'l><'col-sm-4'p>>" + "t" + "<'row'<'col-sm-12'p>>",
                columns: [ 
                    {
                        data: "Name",
                        render: function (data, type, row) {

                            // Anzeige in der Tabelle
                            if (type === "display") {
                                return `
<span class="tooltip-name">
                ${data}
                <span class="info-text">
                    <strong>${data}</strong><br>
                    ${row.Detailtext}
                </span>
</span>`;
                            }

                            // wichtig: nur Name für Suche verwenden
                            if (type === "filter" || type === "search") {
                                return data;
                            }

                            return data;
                        }
                    },
                    { data: "Beruf" },
                    { data: "Geburtsdatum/-ort", orderable: false },
                    { data: "Sterbedatum/-ort", orderable: false },
                    { data: "Religion", orderable: false },
                    { data: "Ausreiseort"},
                    { data: "Emigrationsweg", orderable: false }
                ]
            })
            /* =========================
      🔍 SUCHFILTER
========================= */
            function escapeRegex(text) {
                return text.replace(/[.*+?^${}()[\]\\]/g, '\\$&');
            }

            function buildSearchRegex(input) {
                if (!input) return '';

                let tokens = input.match(/"[^"]+"|\S+/g) || [];

                let andParts = [];
                let notParts = [];
                let orParts = [];

                tokens.forEach(t => {
                    if (t.startsWith('"') && t.endsWith('"')) {
                        andParts.push(escapeRegex(t.slice(1, -1)));
                    }
                    else if (t.startsWith('!')) {
                        notParts.push(escapeRegex(t.substring(1)));
                    }
                    else if (t.includes('|')) {
                        t.split('|').forEach(p => {
                            orParts.push(escapeRegex(p));
                        });
                    }
                    else {
                        andParts.push(escapeRegex(t));
                    }
                });

                // Reines NOT
                if (notParts.length && !andParts.length && !orParts.length) {
                    // Negative Lookahead direkt auf ganzen String
                    return '^(?!.*(' + notParts.join('|') + ')).*$';
                }

                let regex = '^';

                // NOT-Bedingung (wenn AND oder OR auch da sind)
                if (notParts.length) {
                    regex += '(?!.*(' + notParts.join('|') + '))';
                }

                // AND-Bedingung
                if (andParts.length) {
                    regex += andParts.map(t => '(?=.*' + t + ')').join('');
                }

                // OR-Bedingung
                if (orParts.length) {
                    regex += '(?=.*(' + orParts.join('|') + '))';
                }

                regex += '.*';
                return regex;
            }

            $('#demo thead tr:eq(1) th').each(function (i) {
                let title = $(this).text();
                $(this).html('<input type="text" placeholder="' + title + '" style="width:100%;"/>');
            });


            // Spaltenfilter (UND / ODER / NOT)
            $('#demo thead tr:eq(1) input').on('keyup change', function () {

                let colIndex = $(this).closest('th').index();
                let val = $(this).val().trim();

                let regex = buildSearchRegex(val);

                table
                    .column(colIndex)
                    .search(regex, true, false)
                    .draw();
            });

            // Highlighting
            table.on('draw', function () {

                $('#demo tbody td').unmark();

                $('#demo thead tr:eq(1) input').each(function (colIndex) {

                    let val = $(this).val().trim();
                    if (!val) return;

                    let tokens = val.match(/"[^"]+"|\S+/g) || [];

                    let terms = tokens
                        .filter(t => !t.startsWith('!'))
                        .flatMap(t => {
                            if (t.includes('|')) return t.split('|');
                            if (t.startsWith('"')) return [t.slice(1, -1)];
                            return [t];
                        });

                    $('#demo tbody tr').each(function () {
                        $(this).find('td').eq(colIndex).mark(terms, {
                            separateWordSearch: false
                        });
                    });

                });

            });

            // Update Row Count


            function updateRowCount() {
                let count = table.rows({ search: 'applied' }).count();
                $('#rowCount').text(count);
            }
            table.on('draw', updateRowCount);
            updateRowCount();

            // Berufsgruppe Dropdown
            function createBerufsgruppeDropdown() {
                let container = $('#berufsgruppeDropdown');
                container.empty();
                container.append('<button type="button" class="filter-btn">Berufsgruppe wählen</button>');

                let box = $('<div class="filter-box"></div>');

                // "Alle" Checkbox immer zuerst
                box.append(`<label><input type="checkbox" class="berufsCheckbox" value="all" checked> Alle</label><br>`);

                // Berufsgruppen dynamisch ermitteln
                let berufsgruppen = [...new Set(daten.flatMap(d => splitValues(d.Berufsgruppe)))].sort();
                berufsgruppen = berufsgruppen.filter(v => v !== "Sonstige")
                    .concat(berufsgruppen.includes("Sonstige") ? ["Sonstige"] : []);

                // Berufsgruppen hinzufügen
                berufsgruppen.forEach(v => box.append(`<label><input type="checkbox" class="berufsCheckbox" value="${v}"> ${v}</label><br>`));

                container.append(box);
            }
            createBerufsgruppeDropdown();

            // Disziplin Dropdown
            function createDisziplinDropdown(bereich) {
                let container = $('#disziplinDropdown');
                container.empty();
                container.append('<button type="button" class="filter-btn">Fachbereich wählen</button>');
                let box = $('<div class="filter-box"></div>');
                box.append(`<label><input type="checkbox" class="disziCheckbox" value="all" checked> Alle</label><br>`);
                let disziplinen = [...new Set(
                    daten
                        .filter(d => (bereich === "Alle" || d.Bereich === bereich) &&
                            (d.Bereich === "Geisteswissenschaften" || d.Bereich === "Exakte Wissenschaften"))
                        .flatMap(d => splitValues(d.Disziplin))
                )].sort();
                disziplinen = disziplinen.filter(v => v !== "Sonstige")
                    .concat(disziplinen.includes("Sonstige") ? ["Sonstige"] : []);
                disziplinen.forEach(v => box.append(`<label><input type="checkbox" class="disziCheckbox" value="${v}"> ${v}</label><br>`));
                container.append(box);
            }

            function createLandDropdown() {
                let container = $('#landDropdown'); // Container div im HTML
                container.empty();
                container.append('<button type="button" class="filter-btn">Ausreiseland wählen</button>');

                let box = $('<div class="filter-box"></div>');

                // "Alle" Checkbox immer zuerst
                box.append(`<label><input type="checkbox" class="landCheckbox" value="all" checked> Alle</label><br>`);

                // Alle Länder extrahieren
                let laender = [...new Set(
                    daten
                        .map(d => d.Ausreiseland)   // neue Spalte verwenden
                        .filter(v => v && v.toLowerCase() !== "k.a.") // k.A. optional ausschließen
                )].sort();

                // Checkboxen für Länder hinzufügen
                laender.forEach(l => box.append(`<label><input type="checkbox" class="landCheckbox" value="${l}"> ${l}</label><br>`));

                container.append(box);
            }
            function updateLandOptions(dataArray) {
                let container = $('#landDropdown');
                let box = container.find('.filter-box');
                box.empty();
                box.append(`<label><input type="checkbox" class="landCheckbox" value="all" checked> Alle</label><br>`);

                let laender = [...new Set(
                    dataArray
                        .map(d => d.Ausreiseland) // neue Spalte
                        .filter(v => v && v.toLowerCase() !== "k.a.")
                )].sort();

                laender.forEach(l => box.append(`<label><input type="checkbox" class="landCheckbox" value="${l}"> ${l}</label><br>`));
            }
            createLandDropdown();
            updateLandOptions(daten);
            $('#disziplinDropdown').hide();


            function createEmigrationslandDropdown() {

                let container = $('#emigrationslandDropdown');

                // Existierende filter-box entfernen (falls neu aufgebaut wird)
                container.find('.filter-box').remove();

                let box = $('<div class="filter-box"></div>');

                // "Alle"-Checkbox
                box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="all" checked> Alle</label><br>`);

                // Länder extrahieren (auch bei Komma-getrennten Werten)
                let laender = [...new Set(
                    daten
                        .flatMap(d => {
                            if (!d.Emigrationsland) return [];
                            return d.Emigrationsland
                                .split(',')
                                .map(v => v.trim())
                                .filter(v => v && v !== "k.A."); // nur k.A. ausschließen
                        })
                )].sort();

                // Checkboxen hinzufügen
                laender.forEach(l => {
                    box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="${l}"> ${l}</label><br>`);
                });

                // Box anhängen (Button bleibt erhalten!)
                container.append(box);
            }
            function updateEmigrationslandDropdown(dataArray) {
                let container = $('#emigrationslandDropdown');

                // Alte Box löschen, falls vorhanden
                container.find('.filter-box').remove();

                let box = $('<div class="filter-box"></div>');

                // "Alle"-Checkbox immer zuerst
                box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="all" checked> Alle</label><br>`);

                // Länder aus den aktuellen Daten extrahieren (split bei Komma, trim, k.A. ausschließen)
                let laender = [...new Set(
                    dataArray
                        .flatMap(d => {
                            if (!d.Emigrationsland) return [];
                            return d.Emigrationsland
                                .split(',')
                                .map(v => v.trim())
                                .filter(v => v && v.toLowerCase() !== "k.a."); // k.A. wird ausgeschlossen
                        })
                )].sort();

                // Checkboxen für jedes Land erstellen
                laender.forEach(l => {
                    box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="${l}"> ${l}</label><br>`);
                });

                // Box anhängen
                container.append(box);
            }

            // Initial aufrufen
            createEmigrationslandDropdown();
            updateEmigrationslandDropdown(daten);

            // Dropdown öffnen/schließen
            $(document).on('click', '.filter-btn', function (e) {
                e.stopPropagation();
                $(this).siblings('.filter-box').toggle();
            });

            $(document).on('click', function () {
                $('.filter-box').hide();
            });

            $(document).on('click', '.filter-box', function (e) {
                e.stopPropagation();
            });

            /* =========================
     📅 JAHRESFILTER
========================= */
            function parseYearInput(value) {
                if (!value) return [];
                value = value.trim();

                const filters = [];

                // Schritt 1: Komma-getrennte Teile
                const parts = value.split(',').map(s => s.trim());

                parts.forEach(part => {
                    // Leerzeichen trennen, z.B. ">1933 <1938" -> [">1933","<1938"]
                    const subParts = part.split(/\s+/).filter(Boolean);
                    subParts.forEach(sp => {
                        const match = sp.match(/^(<=|>=|<|>)?\s*(\d{4})$/);
                        if (match) {
                            const op = match[1] || "=";
                            const year = parseInt(match[2], 10);
                            filters.push({ op, year });
                        }
                    });
                });

                return filters; // Array von {op, year}
            }

            function updateFilterStatus() {

                let active = [];

                // Berufsgruppe
                let berufs = $('.berufsCheckbox:checked').map((i, e) => e.value).get();
                if (berufs.includes("all") === false && berufs.length > 0) {
                    active.push("Beruf: " + berufs.join(", "));
                }

                let bereich = $('#bereichFilter').val();
                if (bereich && bereich !== "Alle") {
                    active.push("Beruf: " + bereich);
                }

                // Disziplin
                let diszi = $('.disziCheckbox:checked').map((i, e) => e.value).get();
                if (diszi.includes("all") === false && diszi.length > 0) {
                    active.push("Bereich: " + diszi.join(", "));
                }

                // Religion
                let religion = $('input[name="religionFilter"]:checked').map((i, e) => e.value).get();
                if (religion.includes("all") === false && religion.length > 0) {
                    active.push("Religion: " + religion.join(", "));
                }
                let land = $('.landCheckbox:checked').map((i, e) => e.value).get();
                if (land.includes("all") === false && land.length > 0) {
                    active.push("Ausreiseland: " + land.join(", "));
                }
                let emigLand = $('.emigLandCheckbox:checked').map((i, e) => e.value).get();
                if (emigLand.includes("all") === false && emigLand.length > 0) {
                    active.push("Zielland: " + emigLand.join(", "));
                }

                // Update HTML
                $('#activeFilters').html(active.map(f => `<span>${f}</span>`).join(" "));
            }

            // Filterfunktion
            function applyFilter() {
                let mode = $('input[name="mode"]:checked').val();

                let berufsSelected = $('.berufsCheckbox:checked').map((i, e) => e.value).get();
                if (berufsSelected.includes("all")) berufsSelected = [];
                let bereich = $('#bereichFilter').val();
                let disziSelected = $('.disziCheckbox:checked').map((i, e) => e.value).get();
                if (disziSelected.includes("all")) disziSelected = [];
                let landSelected = $('.landCheckbox:checked').map((i, e) => e.value).get();
                if (landSelected.includes("all")) landSelected = [];
                let emigLandSelected = $('.emigLandCheckbox:checked').map((i, e) => e.value).get();
                if (emigLandSelected.includes("all")) emigLandSelected = [];


                $.fn.dataTable.ext.search = [];
                $.fn.dataTable.ext.search.push(function (settings, data, index) {
                    let row = table.row(index).data();

                    // --- Jahresfilter für alle yearFilter-Felder ---
                    let yearPass = true;
                    $('.yearFilter').each(function () {
                        const inputVal = $(this).val().trim();
                        const columnName = $(this).data('column');
                        const rowValue = parseInt(row[columnName]);

                        if (!inputVal) return;

                        const filters = parseYearInput(inputVal);

                        if (isNaN(rowValue)) { yearPass = false; return false; }

                        // OR für "=" Filter
                        const eqFilters = filters.filter(f => f.op === "=");
                        if (eqFilters.length > 0) {
                            let match = eqFilters.some(f => rowValue === f.year);
                            if (!match) { yearPass = false; return false; }
                        }

                        // AND für andere Operatoren
                        const otherFilters = filters.filter(f => f.op !== "=");
                        for (let f of otherFilters) {
                            const { op, year } = f;
                            if (op === ">" && !(rowValue > year)) { yearPass = false; return false; }
                            if (op === "<" && !(rowValue < year)) { yearPass = false; return false; }
                            if (op === ">=" && !(rowValue >= year)) { yearPass = false; return false; }
                            if (op === "<=" && !(rowValue <= year)) { yearPass = false; return false; }
                        }
                    });
                    if (!yearPass) return false;
                    // --- Berufsgruppe / Bereich / Disziplin ---
                    if (mode === "alle") {
                        if (berufsSelected.length > 0 && !berufsSelected.some(v => splitValues(row.Berufsgruppe).includes(v))) return false;
                    } else {
                        if (row.Bereich !== "Geisteswissenschaften" && row.Bereich !== "Exakte Wissenschaften") return false;
                        if (bereich !== "Alle" && row.Bereich !== bereich) return false;
                        if (disziSelected.length > 0 && !disziSelected.some(v => splitValues(row.Disziplin).includes(v))) return false;
                    }

                    let religionSelected = $('input[name="religionFilter"]:checked').map((i, e) => e.value).get();

                    // "All" bedeutet: keine Einschränkung
                    if (religionSelected.includes("all")) religionSelected = [];

                    if (religionSelected.length > 0) {
                        const relText = (row.Religion_Gruppe || "").toLowerCase();
                        const matches = religionSelected.some(cat =>
                            religionMapping[cat].some(term => relText.includes(term))
                        );
                        if (!matches) return false;
                    }
                    if (landSelected.length > 0) {
                        const land = row.Ausreiseland; // neue Spalte
                        if (!land || land.toLowerCase() === "k.a.") return false; // optional k.A. ausschließen
                        if (!landSelected.includes(land)) return false;
                    }
                    if (emigLandSelected.length > 0) {

                        if (!row.Emigrationsland) return false;

                        // Werte aus der Tabelle (auch Komma-getrennt)
                        let rowLaender = row.Emigrationsland
                            .split(',')
                            .map(v => v.trim());

                        // Prüfen, ob mindestens ein Land passt
                        let match = emigLandSelected.some(l => rowLaender.includes(l));

                        if (!match) return false;
                    }

                    return true;
                });

                table.draw();

                $('#rowCount').text(table.rows({ filter: 'applied' }).count());
                updateFilterStatus();
            }

            /* =========================
     🔁 RESET
========================= */

            // Events
            $(document).on('change', '.berufsCheckbox', function () {
                const isAll = $(this).val() === "all";
                const box = $(this).closest('.filter-box');
                const allCheckbox = box.find('input[value="all"]');

                if (isAll && this.checked) {
                    box.find('input[type="checkbox"]').not(this).prop('checked', false);
                } else if (!isAll && this.checked) {
                    allCheckbox.prop('checked', false);
                }

                applyFilter();
            });
            $('#bereichFilter').on('change', function () {
                createDisziplinDropdown($(this).val());
                applyFilter();
            });
            $(document).on('change', '.disziCheckbox', function () {
                const isAll = $(this).val() === "all";
                const box = $(this).closest('.filter-box');
                const allCheckbox = box.find('input[value="all"]');

                if (isAll && this.checked) {
                    // alle anderen abwählen
                    box.find('input[type="checkbox"]').not(this).prop('checked', false);
                } else if (!isAll && this.checked) {
                    // wenn andere angeklickt wird, "Alle" abwählen
                    allCheckbox.prop('checked', false);
                }

                applyFilter(); // Filter sofort anwenden
            });
            $(document).on('change', 'input[name="religionFilter"]', function () {
                const checkboxes = Array.from(document.querySelectorAll('input[name="religionFilter"]'));
                const allCheckbox = checkboxes.find(cb => cb.value === 'all');
                const changed = this;

                // Wenn "Alle" angeklickt wird, andere abwählen
                if (changed === allCheckbox && allCheckbox.checked) {
                    checkboxes.forEach(cb => cb.checked = (cb === allCheckbox));
                }

                // Wenn andere angeklickt wird, "Alle" abwählen
                if (changed !== allCheckbox && changed.checked) {
                    allCheckbox.checked = false;
                }

                applyFilter(); // Filter sofort anwenden
            });
            $(document).on('change', '.landCheckbox', function () {
                const isAll = $(this).val() === "all";
                const box = $(this).closest('.filter-box');
                const allCheckbox = box.find('input[value="all"]');

                if (isAll && this.checked) {
                    box.find('input[type="checkbox"]').not(this).prop('checked', false);
                } else if (!isAll && this.checked) {
                    allCheckbox.prop('checked', false);
                }

                applyFilter(); // Filter sofort anwenden
            });
            $(document).on('change', '.emigLandCheckbox', function () {

                const isAll = $(this).val() === "all";
                const box = $(this).closest('.filter-box');
                const allCheckbox = box.find('input[value="all"]');

                if (isAll && this.checked) {
                    box.find('input[type="checkbox"]').not(this).prop('checked', false);
                } else if (!isAll && this.checked) {
                    allCheckbox.prop('checked', false);
                }

                applyFilter();
            });
            let yearFilterTimeout;
            $('.yearFilter').on('keyup', function () {
                clearTimeout(yearFilterTimeout);
                yearFilterTimeout = setTimeout(applyFilter, 200); // 200ms nach Tippen
            });

            function resetAllFilters() {

                // Berufsgruppe
                $('.berufsCheckbox').prop('checked', false);
                $('.berufsCheckbox[value="all"]').prop('checked', true);

                // Bereich + Disziplin (Kernmodus)
                $('#bereichFilter').val('Alle');
                createDisziplinDropdown("Alle");

                // Religion
                $('input[name="religionFilter"]').prop('checked', false);
                $('input[name="religionFilter"][value="all"]').prop('checked', true);

                // Länder
                $('.landCheckbox').prop('checked', false);
                $('.landCheckbox[value="all"]').prop('checked', true);

                // Emigrationsländer
                $('.emigLandCheckbox').prop('checked', false);
                $('.emigLandCheckbox[value="all"]').prop('checked', true);

                // Jahre
                $('.yearFilter').val('');

                // Tabellenfilter
                $('#demo thead input').val('');
                table.columns().search('');

                table.order([[0, 'asc']]).draw();
            }

            $('#resetFilters').on('click', function () {

                showLoading();

                setTimeout(() => {

                    resetAllFilters();

                    applyFilter();

                    hideLoading();

                }, 50);
            });

            // Radiobutton Umschaltung
            $('input[name="mode"]').on('change', function () {

                showLoading();

                setTimeout(() => {

                    resetAllFilters();   // 🔥 alles reset hier

                    let mode = $(this).val();

                    if (mode === "alle") {

                        $('#berufsgruppeDropdown').show();
                        $('#bereichFilter').hide();
                        $('#disziplinDropdown').hide().empty();

                        updateLandOptions(daten);
                        updateEmigrationslandDropdown(daten);

                    } else {

                        $('#berufsgruppeDropdown').hide();
                        $('#bereichFilter').show();

                        createDisziplinDropdown($('#bereichFilter').val());
                        $('#disziplinDropdown').show();

                        let kerngruppeData = daten.filter(d => d.Bereich && d.Bereich.trim() !== "");

                        updateLandOptions(kerngruppeData);
                        updateEmigrationslandDropdown(kerngruppeData);
                    }

                    applyFilter();

                    hideLoading();

                }, 50);
            });

            $('#demo tbody').on('click', '.tooltip-name', function (e) {
                e.stopPropagation();

                // Alle anderen Tooltips schließen
                $('.tooltip-name').not(this).removeClass('active');

                // Aktuelles Element toggeln
                $(this).toggleClass('active');
            });

            // Klick außerhalb schließt alle Tooltips
            $(document).on('click', function () {
                $('.tooltip-name').removeClass('active');
            });
        });


     const $button = $('#infoButton');
     const $popup = $('#infoPopup');

     $button.on('click', function (e) {
         e.stopPropagation();
         $popup.toggle();
     });

     $(document).on('click', function () {
         $popup.hide();
     });

     $popup.on('click', function (e) {
         e.stopPropagation();
     });


