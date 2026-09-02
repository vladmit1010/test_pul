/**
 * Kategoriensystem für Diagramm 4 & 5 — Vollständige Begriffs-Taxonomie (Deutsch)
 *
 * Basis: q1_anti_aging, q3_verfahren, q5_anti_attitude, q6_pro_attitide, q7_wirkstoffe
 * (q2_probleme_Concerns ergänzend qualitativ berücksichtigt)
 *
 * Reine Begriffsliste OHNE Zählungen — für manuelle Kuration / NLP-Mapping.
 * Zählungen → js/dashboard-data.js → procedureEffects.aggregates / skincareIngredients.aggregates
 */
window.DashboardTaxonomyDE = {
  chart4: {
    level1: {
      label: 'HAUPTVERFAHREN (Ebene 1)',
      categories: [
        {
          id: 'injection',
          label: 'Injektionsverfahren',
          items: [
            {
              id: 'botox',
              label: 'Botox / Botulinumtoxin',
              synonyms: ['Baby Botox', 'Masseter-Botox', 'Achselbotox', 'Nacken-Botox'],
            },
            {
              id: 'hyaluron-filler',
              label: 'Hyaluron-Filler',
              synonyms: ['Dermal Filler', 'Lippenfiller', 'Tränensäcken-Filler', 'Rino-Filler'],
            },
            {
              id: 'skinbooster',
              label: 'Skinbooster / Profhilo / Biorevitalisation',
              synonyms: ['Profhilo', 'Biorevitalisation'],
            },
            { id: 'pdrn', label: 'Polynukleotide / PDRN', synonyms: ['PDRN'] },
            {
              id: 'biostimulator',
              label: 'Sculptra / Radiesse (Biostimulatoren)',
              synonyms: ['Sculptra', 'Radiesse'],
            },
            {
              id: 'prp',
              label: 'PRP / Eigenbluttherapie / Vampir-Lifting',
              synonyms: ['Vampir-Lifting', 'Eigenbluttherapie'],
            },
            { id: 'mesotherapy', label: 'Mesotherapie', synonyms: [] },
            {
              id: 'lipolysis-injection',
              label: 'Fettwegspritze / Lipolyse-Injektion',
              synonyms: ['Fettwegspritze'],
            },
            {
              id: 'fat-transfer',
              label: 'Fetttransfer / Eigenfett-Unterspritzung',
              synonyms: ['Eigenfett-Unterspritzung'],
            },
          ],
        },
        {
          id: 'energy-based',
          label: 'Apparative / energiebasierte Verfahren',
          items: [
            {
              id: 'hifu',
              label: 'HIFU / HIFU 3D/4D/5D / Ultherapy (Ultraschall-Lifting)',
              synonyms: ['Ultherapy', 'Ultraschall-Lifting'],
            },
            {
              id: 'laser',
              label: 'Laserbehandlung',
              synonyms: ['Fotona-Laser', 'Ablativer Laser', 'Nicht-ablativer Laser', 'IPL'],
            },
            { id: 'laser-hair-removal', label: 'Laser-Haarentfernung', synonyms: [] },
            {
              id: 'radiofrequency',
              label: 'Radiofrequenz (RF-Lifting, Morpheus8, Thermage)',
              synonyms: ['RF-Lifting', 'Morpheus8', 'Thermage'],
            },
            {
              id: 'microneedling',
              label: 'Microneedling',
              synonyms: ['RF-Microneedling', 'PRP-Microneedling'],
            },
            { id: 'microcurrent', label: 'Mikrostrom / EMS', synonyms: ['EMS'] },
          ],
        },
        {
          id: 'chemical-surface',
          label: 'Chemische / oberflächliche Verfahren',
          items: [
            {
              id: 'peeling',
              label: 'Peeling',
              synonyms: ['Fruchtsäure-Peeling', 'AHA-Peeling', 'chemisches Peeling', 'Enzympeeling'],
            },
            {
              id: 'dermabrasion',
              label: 'Dermabrasion / Microdermabrasion',
              synonyms: ['Microdermabrasion'],
            },
          ],
        },
        {
          id: 'thread',
          label: 'Fadenbasierte / minimal-chirurgische Verfahren',
          items: [
            {
              id: 'thread-lift',
              label: 'Fadenlifting',
              synonyms: ['PDO-Fäden', 'Widerhaken-Fäden'],
            },
          ],
        },
        {
          id: 'surgical',
          label: 'Operative Verfahren',
          items: [
            {
              id: 'facelift',
              label: 'Facelift / Facelifting',
              synonyms: ['Wangenlifting', 'Vollgesichts-Lift'],
            },
            { id: 'necklift', label: 'Halslift / Necklift', synonyms: ['Necklift'] },
            { id: 'blepharoplasty', label: 'Blepharoplastik / Lidstraffung', synonyms: ['Lidstraffung'] },
            { id: 'rhinoplasty', label: 'Rhinoplastik / Nasenkorrektur', synonyms: ['Nasenkorrektur'] },
            {
              id: 'liposuction',
              label: 'Fettabsaugung / Liposuktion',
              synonyms: ['360°-Liposuktion'],
            },
            {
              id: 'breast-augmentation',
              label: 'Brustvergrößerung / Brustimplantate / Brustharmonisierung',
              synonyms: ['Brustimplantate', 'Brustharmonisierung'],
            },
            { id: 'bbl', label: 'BBL (Brazilian Butt Lift)', synonyms: ['Brazilian Butt Lift'] },
            { id: 'hair-transplant', label: 'Haartransplantation', synonyms: [] },
            { id: 'otoplasty', label: 'Ohren anlegen', synonyms: [] },
            { id: 'scar-revision', label: 'Narbenkorrektur (operativ)', synonyms: [] },
          ],
        },
        {
          id: 'non-invasive-addons',
          label: 'Nicht-invasive Alternativen / Add-ons',
          items: [
            { id: 'lip-plumper', label: 'Lip Plumper (nicht-invasiv)', synonyms: [] },
            { id: 'veneers', label: 'Veneers', synonyms: [] },
            {
              id: 'hyaluronidase',
              label: 'Filler-Auflösung mit Hyaluronidase/Hylase',
              synonyms: ['Hylase'],
            },
          ],
        },
      ],
    },
    level2a: {
      label: 'POSITIVE EFFEKTE & MOTIVATIONEN (Ebene 2A – Grün)',
      polarity: 'positive',
      color: '#7ecdb8',
      items: [
        {
          id: 'wrinkle-reduction',
          label: 'Faltenreduktion',
          synonyms: ['Falten glätten', 'Mimikfalten mindern', 'Krähenfüße reduzieren'],
        },
        {
          id: 'natural-look',
          label: 'Natürlicher Look',
          synonyms: ['kein Maskeneffekt', 'man selbst bleiben', 'subtiles Ergebnis', 'less is more'],
        },
        {
          id: 'volume-restoration',
          label: 'Volumenaufbau / Volumenausgleich',
          synonyms: ['verlorenes Volumen zurückbringen', 'Konturen definieren'],
        },
        {
          id: 'skin-tightening',
          label: 'Hautstraffung / Lifting-Effekt',
          synonyms: ['natürliches Lifting', 'ohne OP'],
        },
        {
          id: 'refreshed-look',
          label: 'Frischeres/erholtes Aussehen',
          synonyms: ['frisch statt gemacht', 'entspannter Ausdruck'],
        },
        {
          id: 'youthful-look',
          label: 'Jugendlicheres Aussehen / Anti-Aging-Effekt',
          synonyms: [],
        },
        {
          id: 'preserved-mimic',
          label: 'Erhaltene Mimik',
          synonyms: ['Mimik bleibt lebendig'],
        },
        {
          id: 'symmetry-improvement',
          label: 'Symmetrie-/Proportionsverbesserung',
          synonyms: [],
        },
        {
          id: 'collagen-stimulation',
          label: 'Kollagenanregung / Hautregeneration',
          synonyms: [],
        },
        {
          id: 'fast-recovery',
          label: 'Schnelle Erholung / kaum Ausfallzeit / schmerzarm',
          synonyms: [],
        },
        {
          id: 'minimally-invasive',
          label: 'Minimalinvasivität / gute Verträglichkeit',
          synonyms: [],
        },
        {
          id: 'long-lasting-result',
          label: 'Nachhaltiges/langanhaltendes Ergebnis',
          synonyms: [],
        },
        {
          id: 'self-confidence',
          label: 'Selbstbewusstsein / Selbstwertgefühl / Empowerment',
          synonyms: ['sich attraktiver fühlen', 'sich wieder im Spiegel gefallen'],
        },
        {
          id: 'medical-benefit',
          label: 'Medizinischer Zusatznutzen',
          synonyms: ['Migräne', 'CMD', 'Kieferschmerzen', 'Hyperhidrose', 'Schwitzen'],
        },
        {
          id: 'self-determination',
          label: 'Selbstbestimmung / freie, informierte Entscheidung',
          synonyms: [],
        },
        {
          id: 'openness',
          label: 'Offenheit statt Geheimhaltung',
          synonyms: ['ehrlicher Umgang mit Behandlung'],
        },
        {
          id: 'responsible-consultation',
          label: 'Individuelle, verantwortungsvolle Beratung',
          synonyms: ['reduzierte Dosierung', 'erfahrene Behandler'],
        },
      ],
    },
    level2b: {
      label: 'NEGATIVE FOLGEN, ÄNGSTE & BARRIEREN (Ebene 2B – Rot/Orange)',
      polarity: 'negative',
      color: '#e8a0bf',
      categories: [
        {
          id: 'aesthetic-fears',
          label: 'Ästhetische Sorgen (übertriebenes/künstliches Ergebnis)',
          items: [
            { id: 'frozen-look', label: 'Frozen Look / Frozen Face / starrer Ausdruck', synonyms: [] },
            { id: 'mask-effect', label: 'Maskenhafter Look / Maskeneffekt / ausdruckslos', synonyms: [] },
            { id: 'pillow-face', label: 'Pillow Face / Kissengesicht (Überfüllung)', synonyms: [] },
            { id: 'duckface', label: 'Duckface / Entenschnabel-Lippen', synonyms: [] },
            {
              id: 'unnatural-look',
              label: 'Unnatürlicher/künstlicher Look',
              synonyms: ['Fake', 'wie aus der KI'],
            },
            { id: 'overdone', label: 'Übertrieben/overdone/übergespritzt', synonyms: [] },
            {
              id: 'disfigured',
              label: 'Verzerrtes/entstelltes/„verhunztes" Gesicht',
              synonyms: [],
            },
            { id: 'uniform-look', label: 'Einheitslook / „alle schauen gleich aus"', synonyms: [] },
            { id: 'asymmetry', label: 'Asymmetrie / schiefe Ergebnisse', synonyms: [] },
            { id: 'puffy-look', label: 'Aufgedunsenes/puffiges Aussehen', synonyms: [] },
          ],
        },
        {
          id: 'medical-risks',
          label: 'Medizinische Nebenwirkungen & Risiken',
          items: [
            { id: 'swelling', label: 'Schwellung / Blutergüsse', synonyms: [] },
            { id: 'redness-irritation', label: 'Rötung / Hautreizung / Brennen / Jucken', synonyms: [] },
            { id: 'pain', label: 'Schmerzen bei/nach Behandlung', synonyms: [] },
            { id: 'necrosis-infection', label: 'Nekrose / Infektion / Entzündung', synonyms: [] },
            {
              id: 'vascular-complications',
              label: 'Gefäßkomplikationen / Erblindung (Filler Blindness)',
              synonyms: ['Filler Blindness'],
            },
            { id: 'filler-migration', label: 'Filler-Migration / nicht auflösbarer Filler', synonyms: [] },
            { id: 'scarring', label: 'Narbenbildung', synonyms: [] },
            { id: 'allergic-reaction', label: 'Allergische Reaktionen', synonyms: [] },
            { id: 'brow-drop', label: 'Absinken der Augenbrauen (Brow Drop) / „Heavy Brows"', synonyms: [] },
            { id: 'mimic-impairment', label: 'Sprech-/Mimikbeeinträchtigung', synonyms: [] },
            { id: 'pigmentation-change', label: 'Pigmentveränderungen (irreversibel)', synonyms: [] },
            { id: 'hypertrichosis', label: 'Paradoxe Hypertrichose (nach Laser)', synonyms: [] },
          ],
        },
        {
          id: 'psycho-social',
          label: 'Psychologisch-soziale Barrieren',
          items: [
            { id: 'botched', label: 'Botched/Fehlbehandlung / Pfusch(er)', synonyms: [] },
            { id: 'regret', label: 'Reue / Bereuen der Behandlung', synonyms: [] },
            {
              id: 'repeat-pressure',
              label: 'Nachspritzdruck / Wiederholungs-/Suchtbefürchtung',
              synonyms: [],
            },
            { id: 'needle-phobia', label: 'Nadelangst / Angst vor Injektionen', synonyms: [] },
            { id: 'stigma', label: 'Stigma / Geheimhaltung / Scham', synonyms: [] },
            {
              id: 'social-pressure',
              label: 'Gesellschaftlicher Druck / Schönheitswahn / Jugendkult',
              synonyms: [],
            },
            { id: 'social-media-pressure', label: 'Social-Media-/Instagram-Druck', synonyms: [] },
            { id: 'authenticity-loss', label: 'Verlust der Authentizität / Identitätsverlust', synonyms: [] },
            { id: 'trust-deficit', label: 'Fehlendes Vertrauen in Behandler/Praxis', synonyms: [] },
            {
              id: 'too-young-criticism',
              label: 'Kritik an jungen Nutzerinnen',
              synonyms: ['mit 20 kein Botox nötig'],
            },
          ],
        },
        {
          id: 'practical-financial',
          label: 'Praktische/finanzielle Barrieren',
          items: [
            { id: 'high-cost', label: 'Hohe Kosten / teure Behandlung', synonyms: [] },
            {
              id: 'maintenance-burden',
              label: 'Unklare Anzahl nötiger Sitzungen / Maintenance-Aufwand',
              synonyms: [],
            },
            {
              id: 'no-visible-result',
              label: 'Kein sofort sichtbares oder ausbleibendes Ergebnis',
              synonyms: [],
            },
            {
              id: 'illegal-providers',
              label: 'Illegale/nicht-medizinische Anbieter',
              synonyms: ['Kosmetikstudios ohne Ausbildung'],
            },
          ],
        },
      ],
    },
  },

  chart5: {
    level1: {
      label: 'WIRKSTOFFE & INHALTSSTOFFE (Ebene 1)',
      categories: [
        {
          id: 'retinoids',
          label: 'Retinoide/Vitamin-A-Familie',
          items: [
            {
              id: 'retinol',
              label: 'Retinol / Retinal (Retinaldehyd) / Retinoide / Tretinoin / Isotretinoin',
              synonyms: ['Retinal', 'Retinaldehyd', 'Tretinoin', 'Isotretinoin'],
            },
          ],
        },
        {
          id: 'humectants',
          label: 'Feuchthaltefaktoren',
          items: [
            {
              id: 'hyaluronic-acid',
              label: 'Hyaluronsäure / Sodium Hyaluronate',
              synonyms: ['Sodium Hyaluronate'],
            },
            { id: 'polyglutamic-acid', label: 'Polyglutamic Acid', synonyms: [] },
            { id: 'glycerin', label: 'Glycerin', synonyms: [] },
            { id: 'urea', label: 'Urea', synonyms: [] },
          ],
        },
        {
          id: 'antioxidants',
          label: 'Antioxidantien / Vitamine',
          items: [
            { id: 'vitamin-c', label: 'Vitamin C (Ascorbinsäure)', synonyms: ['Ascorbinsäure'] },
            { id: 'vitamin-e', label: 'Vitamin E (Tocopherol)', synonyms: ['Tocopherol'] },
            { id: 'niacinamide', label: 'Niacinamid', synonyms: [] },
            { id: 'resveratrol', label: 'Resveratrol', synonyms: [] },
            { id: 'ferulic-acid', label: 'Ferulasäure', synonyms: [] },
            { id: 'coq10', label: 'Coenzym Q10', synonyms: [] },
            { id: 'sod', label: 'SOD', synonyms: [] },
            { id: 'green-tea', label: 'Grüntee-Extrakt', synonyms: [] },
          ],
        },
        {
          id: 'acids',
          label: 'Säuren / Exfolianten',
          items: [
            {
              id: 'aha',
              label: 'AHA',
              synonyms: ['Glykolsäure', 'Milchsäure', 'Mandelsäure'],
            },
            { id: 'bha', label: 'BHA (Salicylsäure)', synonyms: ['Salicylsäure'] },
            {
              id: 'pha',
              label: 'PHA',
              synonyms: ['Gluconolactone', 'Lactobionic Acid'],
            },
            { id: 'azelaic-acid', label: 'Azelainsäure', synonyms: [] },
            { id: 'tranexamic-acid', label: 'Tranexamsäure', synonyms: [] },
          ],
        },
        {
          id: 'peptides',
          label: 'Peptide & Proteine',
          items: [
            { id: 'peptides', label: 'Peptide (allgemein)', synonyms: [] },
            { id: 'copper-peptides', label: 'Kupferpeptide', synonyms: [] },
            {
              id: 'matrixyl',
              label: 'Matrixyl (Palmitoyl-Pentapeptide)',
              synonyms: ['Palmitoyl-Pentapeptide'],
            },
            {
              id: 'argirelox',
              label: 'Argirelox (Acetyl Hexapeptide-8)',
              synonyms: ['Acetyl Hexapeptide-8'],
            },
            { id: 'collagen', label: 'Kollagen(-Peptide)', synonyms: ['Kollagen-Peptide'] },
            { id: 'growth-factors', label: 'Wachstumsfaktoren', synonyms: [] },
            { id: 'egf', label: 'EGF', synonyms: [] },
          ],
        },
        {
          id: 'botanical',
          label: 'Pflanzliche/natürliche Wirkstoffe',
          items: [
            { id: 'bakuchiol', label: 'Bakuchiol', synonyms: [] },
            { id: 'centella', label: 'Centella Asiatica (Cica)', synonyms: ['Cica'] },
            { id: 'aloe', label: 'Aloe Vera', synonyms: [] },
            { id: 'licorice', label: 'Süßholzextrakt', synonyms: [] },
            { id: 'pomegranate', label: 'Granatapfelextrakt', synonyms: [] },
            { id: 'grape-seed', label: 'Traubenkernextrakt', synonyms: [] },
            { id: 'snail-mucin', label: 'Schneckenschleim (Snail Mucin)', synonyms: ['Snail Mucin'] },
            { id: 'shea-butter', label: 'Sheabutter', synonyms: [] },
            { id: 'jojoba', label: 'Jojobaöl', synonyms: [] },
            { id: 'algae', label: 'Algen-Extrakte', synonyms: [] },
          ],
        },
        {
          id: 'brightening-actives',
          label: 'Aufhellende Wirkstoffe',
          items: [
            { id: 'alpha-arbutin', label: 'Alpha Arbutin', synonyms: [] },
            { id: 'kojic-acid', label: 'Kojisäure', synonyms: [] },
          ],
        },
        {
          id: 'barrier-soothing',
          label: 'Barriere-/Beruhigungswirkstoffe',
          items: [
            { id: 'ceramides', label: 'Ceramide', synonyms: [] },
            { id: 'panthenol', label: 'Panthenol', synonyms: [] },
            { id: 'allantoin', label: 'Allantoin', synonyms: [] },
            { id: 'ectoin', label: 'Ectoin', synonyms: [] },
            { id: 'squalane', label: 'Squalan', synonyms: [] },
            { id: 'zinc', label: 'Zink', synonyms: [] },
            { id: 'bisabolol', label: 'Bisabolol', synonyms: [] },
          ],
        },
        {
          id: 'other-actives',
          label: 'Sonstige Aktivstoffe',
          items: [
            { id: 'pdrn-skincare', label: 'PDRN', synonyms: [] },
            { id: 'dmae', label: 'DMAE', synonyms: [] },
            {
              id: 'amino-acids',
              label: 'Aminosäuren',
              synonyms: ['Glycin', 'L-Prolin', 'L-Lysin'],
            },
            { id: 'biotin', label: 'Biotin', synonyms: [] },
            { id: 'msm', label: 'MSM', synonyms: [] },
            { id: 'estradiol', label: 'Estradiol', synonyms: [] },
            { id: 'spf', label: 'SPF / Sonnenschutz (UV-Filter)', synonyms: ['Sonnenschutz', 'UV-Filter'] },
          ],
        },
      ],
    },
    level2a: {
      label: 'HAUTPROBLEME & ALTERUNGSZEICHEN (Ebene 2A – Blau/Grau)',
      polarity: 'concern',
      color: '#8ecae6',
      items: [
        {
          id: 'wrinkles',
          label: 'Falten / Mimikfalten / feine Linien',
          synonyms: ['Krähenfüße', 'Stirnfalten'],
        },
        {
          id: 'dryness',
          label: 'Trockenheit / Spannungsgefühl',
          synonyms: ['Dehydration', 'Trockenheitsfältchen'],
        },
        {
          id: 'elasticity-loss',
          label: 'Elastizitätsverlust / Erschlaffung',
          synonyms: ['Sagging', 'Laxity'],
        },
        {
          id: 'pigmentation',
          label: 'Pigmentflecken / Melasma / Hyperpigmentierung',
          synonyms: ['Altersflecken', 'Sonnenschäden'],
        },
        { id: 'dullness', label: 'Fahler/stumpfer Teint', synonyms: ['Dullness'] },
        { id: 'uneven-tone', label: 'Ungleichmäßiger Hautton', synonyms: [] },
        { id: 'pores', label: 'Große/verstopfte Poren', synonyms: [] },
        { id: 'dark-circles', label: 'Augenringe / Tränensäcke', synonyms: [] },
        {
          id: 'sensitivity',
          label: 'Dünne, empfindliche Haut / Sensitivität',
          synonyms: ['Rosazea'],
        },
        { id: 'acne', label: 'Akne / Hautunreinheiten / Pickel', synonyms: [] },
        { id: 'scars', label: 'Narben (inkl. Aknenarben)', synonyms: ['Aknenarben'] },
        { id: 'redness', label: 'Rötung / Entzündung', synonyms: [] },
        { id: 'barrier-damage', label: 'Geschädigte Hautbarriere', synonyms: [] },
        { id: 'texture', label: 'Unebene Hautstruktur', synonyms: [] },
        { id: 'puffiness', label: 'Schwellungen / Puffiness', synonyms: [] },
      ],
    },
    level2b: {
      label: 'GEWÜNSCHTE ERGEBNISSE & PFLEGEZIELE (Ebene 2B – Grün)',
      polarity: 'result',
      color: '#7ecdb8',
      items: [
        {
          id: 'plump-skin',
          label: 'Pralle Haut / Plump-Effekt',
          synonyms: ['Bounce', 'Cushioning'],
        },
        {
          id: 'radiance',
          label: 'Strahlender Glow',
          synonyms: ['Radiance', 'Luminous', 'Glass Skin'],
        },
        {
          id: 'smoothing',
          label: 'Glattes Hautrelief',
          synonyms: ['Smoothing', 'feine Linien reduzieren'],
        },
        {
          id: 'firming',
          label: 'Gestraffte Konturen',
          synonyms: ['Firming', 'Tightening', 'Lifting'],
        },
        { id: 'pore-refining', label: 'Verfeinerte Poren', synonyms: ['Pore Refining'] },
        { id: 'barrier-repair', label: 'Barriere-Stärkung', synonyms: ['Barrier Repair', 'Barrier Support'] },
        {
          id: 'prevention',
          label: 'Prävention / Zellschutz',
          synonyms: ['Antioxidativer Schutz', 'UV-Schutz'],
        },
        {
          id: 'brightening',
          label: 'Ebenmäßiger Hautton / Aufhellung',
          synonyms: ['Brightening', 'Even Skin Tone'],
        },
        { id: 'hydration', label: 'Feuchtigkeitsversorgung', synonyms: ['Hydration'] },
        {
          id: 'rejuvenation',
          label: 'Kollagenbildung / Verjüngung',
          synonyms: ['Rejuvenation', 'Anti-Aging'],
        },
        { id: 'elasticity', label: 'Elastizität / Resilienz', synonyms: [] },
        {
          id: 'soothing-repair',
          label: 'Beruhigung / Reparatur',
          synonyms: ['Soothing', 'Calming', 'Repair'],
        },
      ],
    },
  },
};
