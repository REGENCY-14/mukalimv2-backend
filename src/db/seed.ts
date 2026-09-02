import "dotenv/config";
import { db, pool } from "./index";
import {
  activityLog,
  categories,
  categoryTranslations,
  contentItems,
  contentTranslations,
  media,
  mediaTranslations,
  settings,
  users,
} from "./schema";
import { hashPassword } from "../utils/password";
import type { Locale } from "../types/localized";

/**
 * Demo data matching what's currently mocked in the frontend
 * (src/lib/admin/mockData.ts + src/lib/categories.ts) — same category
 * names, sample content, sample users across the three roles — so the
 * frontend can be pointed at this API with minimal changes.
 *
 * Re-runnable: truncates every table it seeds first.
 */

function lt(fr: string, en: string, de = "", it = ""): Record<Locale, string> {
  return { fr, en, de, it };
}

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "Password123!";

async function main() {
  console.log("Seeding database…");

  // --- reset (respects FK order) ---
  await db.delete(activityLog);
  await db.delete(mediaTranslations);
  await db.delete(media);
  await db.delete(contentTranslations);
  await db.delete(contentItems);
  await db.delete(categoryTranslations);
  await db.delete(categories);
  await db.delete(users);
  await db.delete(settings);

  // --- users ---
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [amara, jordan, priya, sam, chidi] = await db
    .insert(users)
    .values([
      { name: "Amara Osei", email: "amara@mukalim.com", passwordHash, role: "admin", status: "active", avatarColor: "bg-brand-gold", lastLoginAt: new Date("2026-09-01T08:12:00Z") },
      { name: "Jordan Lee", email: "jordan@mukalim.com", passwordHash, role: "editor", status: "active", avatarColor: "bg-admin-terracotta", lastLoginAt: new Date("2026-08-31T16:45:00Z") },
      { name: "Priya Nair", email: "priya@mukalim.com", passwordHash, role: "editor", status: "invited", avatarColor: "bg-admin-green" },
      { name: "Sam Whitfield", email: "sam@mukalim.com", passwordHash, role: "viewer", status: "active", avatarColor: "bg-brand-brown", lastLoginAt: new Date("2026-08-29T11:20:00Z") },
      { name: "Chidi Okafor", email: "chidi@mukalim.com", passwordHash, role: "viewer", status: "disabled", avatarColor: "bg-admin-warm-grey", lastLoginAt: new Date("2026-07-14T09:03:00Z") },
    ])
    .returning();
  if (!amara || !jordan || !priya || !sam || !chidi) throw new Error("Seeding users failed.");
  console.log(`  users: 5 (demo password: ${DEMO_PASSWORD})`);

  // --- categories ---
  const categorySeeds = [
    {
      slug: "cosmetics",
      icon: "/mukalim/icon-cosmetics.svg",
      hero: "/mukalim/articles/cosmetics-hero.jpg",
      order: 1,
      active: true,
      name: lt("Cosmétiques", "Cosmetics", "Kosmetik", "Cosmetici"),
      description: lt(
        "Des ingrédients botaniques conçus pour leur pureté, apportant une vitalité naturelle à des formulations de soin haut de gamme.",
        "Botanical ingredients crafted for purity, bringing natural vitality to premium skincare formulations.",
        "Botanische Inhaltsstoffe für höchste Reinheit, die natürliche Vitalität in Premium-Hautpflegeformulierungen bringen.",
        "Ingredienti botanici curati per la loro purezza, che apportano vitalità naturale a formulazioni di skincare premium.",
      ),
      heroAlt: lt("Bouquets de plantes séchées suspendus à un étal de marché", "Bundles of dried botanicals hanging at a market stall", "", ""),
    },
    {
      slug: "food-hygiene",
      icon: "/mukalim/icon-hygiene.svg",
      hero: "/mukalim/card-hygiene.jpg",
      order: 2,
      active: true,
      name: lt("Hygiène Alimentaire", "Food Hygiene", "Lebensmittelhygiene", "Igiene Alimentare"),
      description: lt(
        "Des normes rigoureuses et des solutions naturelles garantissant des conditions irréprochables, de la récolte à la manipulation.",
        "Rigorous standards and natural solutions ensuring pristine conditions from harvest to handling.",
        "",
        "Standard rigorosi e soluzioni naturali che garantiscono condizioni impeccabili, dal raccolto alla lavorazione.",
      ),
      heroAlt: lt("Comptoir de cuisine propre et moderne", "A clean, modern kitchen counter", "Sauberer, moderner Küchentresen", ""),
    },
    {
      slug: "food-safety",
      icon: "/mukalim/icon-safety.svg",
      hero: "/mukalim/card-safety.jpg",
      order: 3,
      active: true,
      name: lt("Sécurité Alimentaire", "Food Safety", "Lebensmittelsicherheit", "Sicurezza Alimentare"),
      description: lt(
        "Des protocoles rigoureusement testés qui garantissent une qualité sans compromis et la protection des consommateurs.",
        "Expertly tested protocols that guarantee uncompromising quality and consumer protection.",
        "Fachkundig getestete Protokolle, die kompromisslose Qualität und Verbraucherschutz garantieren.",
        "",
      ),
      heroAlt: lt("Bâtons de cannelle et épices séchées", "Cinnamon sticks and dried spices", "", "Bastoncini di cannella e spezie essiccate"),
    },
    {
      slug: "foods-and-benefits",
      icon: "/mukalim/icon-foods-benefits.svg",
      hero: "/mukalim/articles/fb-hero.jpg",
      order: 4,
      active: true,
      name: lt("Aliments et Bienfaits", "Foods and Benefits", "Lebensmittel und Vorteile", "Alimenti e Benefici"),
      description: lt(
        "L'histoire riche et les bienfaits holistiques des meilleurs ingrédients de la nature, sélectionnés pour la cuisine moderne.",
        "The rich histories and holistic benefits of nature's finest ingredients, curated for the modern kitchen.",
        "",
        "La ricca storia e i benefici olistici dei migliori ingredienti della natura, selezionati per la cucina moderna.",
      ),
      heroAlt: lt("Une ruelle couverte d'un marché aux épices", "A covered alley in a spice market lined with stalls", "Eine überdachte Gasse auf einem Gewürzmarkt", ""),
    },
    {
      slug: "impact-of-therapeutic-treatment",
      icon: "/mukalim/icon-therapeutic.svg",
      hero: "/mukalim/trust.jpg",
      order: 5,
      active: false,
      name: lt(
        "Impact du Traitement Thérapeutique",
        "Impact of Therapeutic Treatment",
        "Wirkung Therapeutischer Behandlung",
        "Impatto del Trattamento Terapeutico",
      ),
      description: lt(
        "Les remèdes traditionnels et la recherche moderne derrière les plantes médicinales les plus respectées de la nature.",
        "Traditional remedies and modern research behind nature's most respected healing botanicals.",
        "Traditionelle Heilmittel und moderne Forschung hinter den angesehensten heilenden Pflanzen der Natur.",
        "",
      ),
      heroAlt: lt("Mains ridées broyant des épices dans un mortier", "Weathered hands grinding spices with a mortar and pestle", "Verwitterte Hände zerstoßen Gewürze mit Mörser und Stößel", ""),
    },
  ] as const;

  const categoryIdBySlug = new Map<string, string>();
  for (const c of categorySeeds) {
    const [row] = await db
      .insert(categories)
      .values({ slug: c.slug, iconUrl: c.icon, heroImageUrl: c.hero, displayOrder: c.order, active: c.active })
      .returning();
    if (!row) throw new Error(`Failed to seed category '${c.slug}'.`);
    categoryIdBySlug.set(c.slug, row.id);

    await db.insert(categoryTranslations).values(
      (["fr", "en", "de", "it"] as const).map((locale) => ({
        categoryId: row.id,
        locale,
        name: c.name[locale],
        description: c.description[locale],
        heroImageAlt: c.heroAlt[locale],
      })),
    );
  }
  console.log(`  categories: ${categorySeeds.length}`);

  // --- content ---
  const authorIdByName: Record<string, string> = { "Amara Osei": amara.id, "Jordan Lee": jordan.id };

  const contentSeeds = [
    {
      slug: "aloe-vera-the-soothing-botanical",
      category: "cosmetics",
      tag: "Botanical",
      status: "published" as const,
      author: "Amara Osei",
      publishedAt: "2026-08-25",
      featuredImage: "/mukalim/articles/art-aloe.jpg",
      title: lt("Aloe Vera : La Plante Apaisante", "Aloe Vera: The Soothing Botanical", "Aloe Vera: Die beruhigende Pflanze", ""),
      excerpt: lt(
        "Découvrez pourquoi le gel de cette plante succulente est prisé depuis des siècles comme base rafraîchissante et réparatrice pour les peaux sensibles.",
        "Discover why this succulent's gel has been prized for centuries as a cooling, restorative base for sensitive skin formulations.",
        "",
        "",
      ),
      body: lt(
        "Découvrez pourquoi le gel de cette plante succulente est prisé depuis des siècles comme base rafraîchissante et réparatrice pour les peaux sensibles.",
        [
          "Aloe vera has been cultivated for its skin-soothing properties since antiquity, prized across Egyptian, Greek, and Indian traditions alike as a first response to sun-exposed or irritated skin.",
          "The gel drawn from its thick, fleshy leaves is rich in polysaccharides and vitamins that help skin retain moisture without leaving a heavy residue — a quality that makes it an unusually versatile base for both leave-on treatments and rinse-off masks.",
          "In our formulations, we source aloe from growers who harvest by hand at peak maturity, when the gel's cooling compounds are most concentrated, then cold-process it to preserve its natural enzymes.",
          "The result is a botanical base that calms as effectively as it hydrates — the reason it remains, centuries on, one of skincare's most trusted ingredients.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Aloe Vera : La Plante Apaisante", "Aloe Vera: The Soothing Botanical", "", ""),
      seoDescription: lt(
        "Découvrez pourquoi le gel de cette plante succulente est prisé depuis des siècles comme base rafraîchissante et réparatrice pour les peaux sensibles.",
        "Discover why this succulent's gel has been prized for centuries as a cooling, restorative base for sensitive skin formulations.",
        "",
        "",
      ),
    },
    {
      slug: "eucalyptus-the-purifying-leaf",
      category: "cosmetics",
      tag: "Leaf",
      status: "published" as const,
      author: "Jordan Lee",
      publishedAt: "2026-08-10",
      featuredImage: "/mukalim/articles/art-eucalyptus.jpg",
      title: lt("Eucalyptus : La Feuille Purifiante", "Eucalyptus: The Purifying Leaf", "", "Eucalipto: La Foglia Purificante"),
      excerpt: lt(
        "Découvrez les propriétés vives et clarifiantes de l'huile d'eucalyptus et son rôle dans des rituels de soin revigorants et purifiants.",
        "Explore the crisp, clarifying properties of eucalyptus oil and its role in invigorating, purifying skincare rituals.",
        "",
        "",
      ),
      body: lt(
        "Découvrez les propriétés vives et clarifiantes de l'huile d'eucalyptus et son rôle dans des rituels de soin revigorants et purifiants.",
        [
          "Native to Australia and now grown across temperate climates worldwide, eucalyptus has long been valued for the crisp, camphoraceous oil held within its silvery leaves.",
          "That oil carries natural clarifying properties, making it a favorite in formulations designed to invigorate tired skin and cut through congestion without stripping the skin's natural barrier.",
          "We steam-distill our eucalyptus leaf in small batches to capture its essential oil at full potency, then blend it at concentrations gentle enough for daily use.",
          "A few drops go a long way — the reason a single branch of eucalyptus can scent an entire formulation with its unmistakable, purifying freshness.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Eucalyptus : La Feuille Purifiante", "Eucalyptus: The Purifying Leaf", "", ""),
      seoDescription: lt(
        "Découvrez les propriétés vives et clarifiantes de l'huile d'eucalyptus et son rôle dans des rituels de soin revigorants et purifiants.",
        "Explore the crisp, clarifying properties of eucalyptus oil and its role in invigorating, purifying skincare rituals.",
        "",
        "",
      ),
    },
    {
      slug: "lavender-the-calming-classic",
      category: "cosmetics",
      tag: "Herb",
      status: "draft" as const,
      author: "Jordan Lee",
      publishedAt: null,
      featuredImage: "/mukalim/articles/art-lavender.jpg",
      title: lt("Lavande : Le Classique Apaisant", "Lavender: The Calming Classic", "", ""),
      excerpt: lt(
        "Explorez l'usage séculaire de la lavande séchée dans les baumes apaisants, et pourquoi son parfum reste un incontournable des soins réparateurs.",
        "Unpack the centuries-old use of dried lavender in soothing balms, and why its aroma remains a staple of restorative skincare.",
        "",
        "",
      ),
      body: lt(
        "Explorez l'usage séculaire de la lavande séchée dans les baumes apaisants, et pourquoi son parfum reste un incontournable des soins réparateurs.",
        [
          "Dried lavender has anchored calming rituals for centuries, from Roman bathhouses to modern apothecaries, prized as much for its fragrance as for its gentle effect on stressed, reactive skin.",
          "The flower's essential oil contains linalool and linalyl acetate, compounds studied for their soothing properties — part of why lavender remains a staple in formulations meant to unwind the skin as much as the mind.",
          "We harvest our lavender at the height of bloom, when its oil content peaks, then dry the bundles slowly to preserve both color and scent.",
          "The result is a botanical that does double duty: a calming active for the skin, and a ritual in itself each time the jar is opened.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Lavande : Le Classique Apaisant", "Lavender: The Calming Classic", "", ""),
      seoDescription: lt(
        "Explorez l'usage séculaire de la lavande séchée dans les baumes apaisants.",
        "Unpack the centuries-old use of dried lavender in soothing balms.",
        "",
        "",
      ),
    },
    {
      slug: "cross-contamination-the-silent-risk",
      category: "food-hygiene",
      tag: "Safety",
      status: "published" as const,
      author: "Amara Osei",
      publishedAt: "2026-08-27",
      featuredImage: "/mukalim/articles/art-kitchen.jpg",
      title: lt("Contamination Croisée : Le Risque Silencieux", "Cross-Contamination: The Silent Risk", "Kreuzkontamination: Das stille Risiko", "Contaminazione Incrociata: Il Rischio Silenzioso"),
      excerpt: lt(
        "Comprenez comment les surfaces et outils partagés peuvent compromettre la pureté, et les protocoles que nous suivons pour garder chaque ingrédient isolé et propre.",
        "Understand how shared surfaces and tools can compromise purity, and the protocols we follow to keep every ingredient isolated and clean.",
        "",
        "",
      ),
      body: lt(
        "Comprenez comment les surfaces et outils partagés peuvent compromettre la pureté, et les protocoles que nous suivons pour garder chaque ingrédient isolé et propre.",
        [
          "Cross-contamination rarely announces itself — a shared cutting board, an unwashed scoop, a storage bin reused between batches — yet it's one of the most common ways purity is compromised before a product ever reaches the shelf.",
          "Our facilities separate ingredient families at every stage of handling, from intake through packaging, with dedicated tools and surfaces for each category we process.",
          "Staff follow color-coded protocols that make cross-use immediately visible to anyone on the floor, turning a risk that's usually invisible into one that's easy to catch.",
          "It's unglamorous work, but it's the foundation every other quality claim we make depends on.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Contamination Croisée : Le Risque Silencieux", "Cross-Contamination: The Silent Risk", "", ""),
      seoDescription: lt(
        "Comprenez comment les surfaces et outils partagés peuvent compromettre la pureté.",
        "Understand how shared surfaces and tools can compromise purity.",
        "",
        "",
      ),
    },
    {
      slug: "cold-chain-integrity",
      category: "food-hygiene",
      tag: "Storage",
      status: "published" as const,
      author: "Jordan Lee",
      publishedAt: "2026-08-12",
      featuredImage: "/mukalim/articles/art-jarshelf.jpg",
      title: lt("Intégrité de la Chaîne du Froid", "Cold Chain Integrity: Why Temperature Matters", "", ""),
      excerpt: lt(
        "Découvrez comment un stockage constant et contrôlé préserve la puissance des ingrédients et prévient leur détérioration, de la récolte jusqu'à votre cuisine.",
        "Explore how consistent, controlled storage preserves potency and prevents spoilage from harvest all the way to your kitchen.",
        "",
        "",
      ),
      body: lt(
        "Découvrez comment un stockage constant et contrôlé préserve la puissance des ingrédients et prévient leur détérioration, de la récolte jusqu'à votre cuisine.",
        [
          "Many of the compounds that give spices and botanicals their potency — volatile oils, delicate pigments, active constituents — begin to degrade the moment they're exposed to heat, light, or fluctuating humidity.",
          "Maintaining a consistent cold chain from harvest through storage slows that degradation dramatically, which is why we track temperature and humidity at every handoff, not just at the warehouse door.",
          "Ingredients that require it are stored in climate-controlled rooms set to the specific range each botanical needs, rather than a single one-size-fits-all setting.",
          "The difference shows up in the final product: brighter color, fuller aroma, and a shelf life that holds up to what the label promises.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Intégrité de la Chaîne du Froid", "Cold Chain Integrity", "", ""),
      seoDescription: lt(
        "Découvrez comment un stockage constant et contrôlé préserve la puissance des ingrédients.",
        "Explore how consistent, controlled storage preserves potency.",
        "",
        "",
      ),
    },
    {
      slug: "sanitizing-naturally",
      category: "food-hygiene",
      tag: "Hygiene",
      status: "published" as const,
      author: "Amara Osei",
      publishedAt: "2026-07-28",
      featuredImage: "/mukalim/articles/art-essentialoil.jpg",
      title: lt("Assainir Naturellement : Antimicrobiens Botaniques", "Sanitizing Naturally: Botanical Antimicrobials", "Natürlich Desinfizieren: Botanische Antimikrobielle Mittel", ""),
      excerpt: lt(
        "Découvrez les huiles et extraits d'origine végétale que nous utilisons pour assainir les surfaces sans produits chimiques synthétiques agressifs.",
        "Discover the plant-derived oils and extracts we use to sanitize surfaces without harsh synthetic chemicals.",
        "",
        "",
      ),
      body: lt(
        "Découvrez les huiles et extraits d'origine végétale que nous utilisons pour assainir les surfaces sans produits chimiques synthétiques agressifs.",
        [
          "Harsh synthetic sanitizers can leave residues that linger on porous surfaces — a particular concern in a facility handling ingredients meant to be consumed or applied to skin.",
          "We rely instead on plant-derived antimicrobials, including thyme and tea tree oil concentrates, which offer meaningful antimicrobial activity without the residue risk of conventional chemical cleaners.",
          "These botanicals are rotated and combined based on current food-safety guidance, always validated against the same efficacy standards we'd expect of any sanitizing agent.",
          "It's a slower, more deliberate approach to hygiene — one that treats the products we're protecting as carefully as the surfaces we're cleaning.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Assainir Naturellement", "Sanitizing Naturally", "", ""),
      seoDescription: lt(
        "Découvrez les huiles et extraits d'origine végétale que nous utilisons pour assainir les surfaces.",
        "Discover the plant-derived oils and extracts we use to sanitize surfaces.",
        "",
        "",
      ),
    },
    {
      slug: "haccp-explained",
      category: "food-safety",
      tag: "Standard",
      status: "published" as const,
      author: "Jordan Lee",
      publishedAt: "2026-08-29",
      featuredImage: "/mukalim/articles/art-lab.jpg",
      title: lt("HACCP Expliqué : Notre Cadre Qualité", "HACCP Explained: Our Quality Framework", "HACCP Erklärt: Unser Qualitätsrahmen", "HACCP Spiegato: Il Nostro Quadro di Qualità"),
      excerpt: lt(
        "Un aperçu du système d'analyse des risques et de maîtrise des points critiques qui régit chaque lot que nous testons et libérons.",
        "A look inside the Hazard Analysis and Critical Control Points system that governs every batch we test and release.",
        "",
        "",
      ),
      body: lt(
        "Un aperçu du système d'analyse des risques et de maîtrise des points critiques qui régit chaque lot que nous testons et libérons.",
        [
          "Hazard Analysis and Critical Control Points, or HACCP, is a systematic framework for identifying where contamination risk is highest in a process, then building controls specifically around those points rather than inspecting only at the end.",
          "For us, that means mapping every step from raw ingredient intake to final packaging, flagging critical control points — like moisture thresholds or metal detection — and setting measurable limits at each one.",
          "Every batch is logged against this framework, with records kept well beyond what regulation requires, so any question about a specific lot can be answered with data, not guesswork.",
          "It's less a certificate on the wall than a discipline built into how every batch moves through the facility.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("HACCP Expliqué", "HACCP Explained", "", ""),
      seoDescription: lt(
        "Un aperçu du système d'analyse des risques et de maîtrise des points critiques.",
        "A look inside the Hazard Analysis and Critical Control Points system.",
        "",
        "",
      ),
    },
    {
      slug: "traceability-from-farm-to-jar",
      category: "food-safety",
      tag: "Sourcing",
      status: "published" as const,
      author: "Amara Osei",
      publishedAt: "2026-08-18",
      featuredImage: "/mukalim/articles/art-farmer.jpg",
      title: lt("Traçabilité : Du Champ au Bocal", "Traceability: From Farm to Jar", "", "Tracciabilità: Dal Campo al Barattolo"),
      excerpt: lt(
        "Suivez le parcours d'un seul ingrédient, du champ du producteur jusqu'à l'étagère de votre cuisine, et les registres qui rendent cela possible.",
        "Follow the journey of a single ingredient from the grower's field to your kitchen shelf, and the records that make it possible.",
        "",
        "",
      ),
      body: lt(
        "Suivez le parcours d'un seul ingrédient, du champ du producteur jusqu'à l'étagère de votre cuisine, et les registres qui rendent cela possible.",
        [
          "A single jar on our shelf can be traced back to the specific farm, harvest date, and processing batch it came from — a chain of custody we maintain from the moment an ingredient leaves the ground.",
          "That traceability isn't just a safety net for recalls; it's how we verify the sourcing claims on our labels are actually true, lot by lot.",
          "We work directly with growers wherever possible, which shortens the chain considerably compared to sourcing through intermediaries where records can get thin.",
          "When you can name the field an ingredient came from, quality stops being a marketing claim and becomes something you can actually stand behind.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Traçabilité : Du Champ au Bocal", "Traceability: From Farm to Jar", "", ""),
      seoDescription: lt(
        "Suivez le parcours d'un seul ingrédient, du champ du producteur jusqu'à l'étagère de votre cuisine.",
        "Follow the journey of a single ingredient from the grower's field to your kitchen shelf.",
        "",
        "",
      ),
    },
    {
      slug: "allergen-control",
      category: "food-safety",
      tag: "Safety",
      status: "draft" as const,
      author: "Jordan Lee",
      publishedAt: null,
      featuredImage: "/mukalim/articles/art-pantryjars.jpg",
      title: lt("Contrôle des Allergènes", "Allergen Control: Protecting Every Batch", "", ""),
      excerpt: lt(
        "Comprenez les protocoles d'étiquetage et de contact croisé qui protègent les consommateurs sensibles sans compromettre la saveur.",
        "Understand the labeling and cross-contact protocols that protect sensitive consumers without compromising flavor.",
        "",
        "",
      ),
      body: lt(
        "Comprenez les protocoles d'étiquetage et de contact croisé qui protègent les consommateurs sensibles sans compromettre la saveur.",
        [
          "Allergen management starts long before a product reaches packaging — with how ingredients are received, stored, and moved through a facility that handles a wide range of botanicals.",
          "We maintain strict segregation for known allergens, dedicated equipment where cross-contact risk is highest, and validated cleaning protocols between runs that share equipment.",
          "Labeling reflects not just what's intentionally included, but a rigorous assessment of what could plausibly cross-contact during processing — because a label is only as trustworthy as the process behind it.",
          "For the people relying on us to get this right, there's no acceptable margin for shortcuts.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Contrôle des Allergènes", "Allergen Control", "", ""),
      seoDescription: lt(
        "Comprenez les protocoles d'étiquetage et de contact croisé qui protègent les consommateurs sensibles.",
        "Understand the labeling and cross-contact protocols that protect sensitive consumers.",
        "",
        "",
      ),
    },
    {
      slug: "turmeric-the-golden-healer",
      category: "foods-and-benefits",
      tag: "Root",
      status: "published" as const,
      author: "Amara Osei",
      publishedAt: "2026-08-28",
      featuredImage: "/mukalim/articles/art-turmeric.jpg",
      title: lt("Curcuma : Le Guérisseur Doré", "Turmeric: The Golden Healer", "Kurkuma: Der Goldene Heiler", "Curcuma: Il Guaritore Dorato"),
      excerpt: lt(
        "Découvrez les puissantes propriétés anti-inflammatoires de la curcumine et comment intégrer cette racine ancestrale à votre rituel de bien-être quotidien.",
        "Discover the powerful anti-inflammatory properties of curcumin and how to integrate this ancient root into your daily wellness ritual.",
        "",
        "",
      ),
      body: lt(
        "Découvrez les puissantes propriétés anti-inflammatoires de la curcumine et comment intégrer cette racine ancestrale à votre rituel de bien-être quotidien.",
        [
          "Turmeric's golden hue comes from curcumin, the compound responsible for both its color and much of the scientific interest surrounding this ancient root.",
          "Used for millennia across South Asian cooking and traditional medicine alike, turmeric has earned renewed attention for curcumin's anti-inflammatory properties, though the compound is notoriously difficult for the body to absorb on its own.",
          "Pairing turmeric with black pepper's piperine, or a source of healthy fat, meaningfully improves absorption — a detail traditional preparations often got right long before the biochemistry was understood.",
          "Whether stirred into a warm milk ritual or blended into a savory spice mix, turmeric remains one of the most quietly powerful roots in the pantry.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Curcuma : Le Guérisseur Doré", "Turmeric: The Golden Healer", "", ""),
      seoDescription: lt(
        "Découvrez les puissantes propriétés anti-inflammatoires de la curcumine.",
        "Discover the powerful anti-inflammatory properties of curcumin.",
        "",
        "",
      ),
    },
    {
      slug: "cardamom-queen-of-spices",
      category: "foods-and-benefits",
      tag: "Spice",
      status: "published" as const,
      author: "Jordan Lee",
      publishedAt: "2026-08-15",
      featuredImage: "/mukalim/articles/art-cardamom.jpg",
      title: lt("Cardamome : La Reine des Épices", "Cardamom: Queen of Spices", "Kardamom: Königin der Gewürze", ""),
      excerpt: lt(
        "Explorez le profil aromatique complexe de la cardamome, ses bienfaits digestifs, et pourquoi elle occupe une place vénérée dans les traditions sucrées comme salées.",
        "Explore the complex flavor profile of cardamom, its digestive benefits, and why it holds a revered place in both sweet and savory traditions.",
        "",
        "",
      ),
      body: lt(
        "Explorez le profil aromatique complexe de la cardamome, ses bienfaits digestifs, et pourquoi elle occupe une place vénérée dans les traditions sucrées comme salées.",
        [
          "Cardamom's complex, slightly citrusy warmth has earned it a place in cuisines as varied as Scandinavian baking and Middle Eastern coffee — a versatility few spices can claim.",
          "Beyond flavor, cardamom has a long history in traditional digestive remedies, valued for its carminative properties that ease bloating and support digestion after a rich meal.",
          "Its essential oils are concentrated in the small black seeds housed within each pod, which is why whole pods retain their potency far longer than pre-ground cardamom.",
          "For the freshest flavor, we recommend cracking pods just before use — a small ritual that unlocks the aromatic intensity this spice is prized for.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Cardamome : La Reine des Épices", "Cardamom: Queen of Spices", "", ""),
      seoDescription: lt(
        "Explorez le profil aromatique complexe de la cardamome et ses bienfaits digestifs.",
        "Explore the complex flavor profile of cardamom and its digestive benefits.",
        "",
        "",
      ),
    },
    {
      slug: "matcha-antioxidant-powerhouse",
      category: "foods-and-benefits",
      tag: "Tea",
      status: "published" as const,
      author: "Amara Osei",
      publishedAt: "2026-07-30",
      featuredImage: "/mukalim/articles/art-matcha.jpg",
      title: lt("Matcha : Concentré d'Antioxydants", "Matcha: Antioxidant Powerhouse", "", "Matcha: Concentrato di Antiossidanti"),
      excerpt: lt(
        "Explorez la science derrière la L-théanine et les catéchines présentes dans le matcha de qualité cérémoniale, et son effet apaisant sur la concentration et l'énergie.",
        "Unpack the science behind L-theanine and catechins found in ceremonial grade matcha, and its calming effect on focus and energy.",
        "",
        "",
      ),
      body: lt(
        "Explorez la science derrière la L-théanine et les catéchines présentes dans le matcha de qualité cérémoniale, et son effet apaisant sur la concentration et l'énergie.",
        [
          "Unlike steeped green tea, matcha is made from whole, shade-grown tea leaves ground into a fine powder — meaning you consume the entire leaf, not just what dissolves into the water.",
          "That distinction matters: matcha delivers significantly higher concentrations of catechins, particularly EGCG, along with L-theanine, an amino acid known for promoting calm, focused alertness rather than the jittery edge of coffee.",
          "Ceremonial grade matcha, reserved for whisking rather than baking, comes from the youngest, most tender leaves — the reason its color and flavor are noticeably more vibrant than culinary-grade powder.",
          "A traditionally whisked bowl of matcha isn't just a beverage; it's a slow ritual built around a plant with genuinely exceptional nutritional density.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Matcha : Concentré d'Antioxydants", "Matcha: Antioxidant Powerhouse", "", ""),
      seoDescription: lt(
        "Explorez la science derrière la L-théanine et les catéchines présentes dans le matcha.",
        "Unpack the science behind L-theanine and catechins found in ceremonial grade matcha.",
        "",
        "",
      ),
    },
    {
      slug: "ginger-ancient-remedy",
      category: "impact-of-therapeutic-treatment",
      tag: "Root",
      status: "published" as const,
      author: "Jordan Lee",
      publishedAt: "2026-08-26",
      featuredImage: "/mukalim/articles/art-ginger.jpg",
      title: lt("Gingembre : Remède Ancestral", "Ginger: Ancient Remedy for Modern Wellness", "Ingwer: Altes Heilmittel für Modernes Wohlbefinden", "Zenzero: Rimedio Ancestrale per il Benessere Moderno"),
      excerpt: lt(
        "Découvrez pourquoi cette racine chauffante ancre la médecine traditionnelle depuis des millénaires, et ce que la recherche moderne révèle sur ses bienfaits.",
        "Discover why this warming root has anchored traditional medicine for millennia, and what modern research reveals about its benefits.",
        "",
        "",
      ),
      body: lt(
        "Découvrez pourquoi cette racine chauffante ancre la médecine traditionnelle depuis des millénaires, et ce que la recherche moderne révèle sur ses bienfaits.",
        [
          "Ginger's warming, slightly peppery bite has made it a fixture of traditional medicine across Asia, Africa, and beyond for thousands of years, most notably as a remedy for nausea and digestive discomfort.",
          "Modern research has largely validated that traditional use, with gingerol — the compound responsible for ginger's characteristic heat — shown to support digestion and ease inflammation.",
          "Fresh ginger and dried ginger aren't interchangeable in effect: drying concentrates certain compounds while diminishing others, which is why traditional preparations often specify one or the other for a given use.",
          "Whether steeped as tea or grated into a meal, ginger remains one of the most well-studied roots in traditional medicine.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Gingembre : Remède Ancestral", "Ginger: Ancient Remedy", "", ""),
      seoDescription: lt(
        "Découvrez pourquoi cette racine chauffante ancre la médecine traditionnelle depuis des millénaires.",
        "Discover why this warming root has anchored traditional medicine for millennia.",
        "",
        "",
      ),
    },
    {
      slug: "star-anise-the-digestive-aid",
      category: "impact-of-therapeutic-treatment",
      tag: "Spice",
      status: "draft" as const,
      author: "Amara Osei",
      publishedAt: null,
      featuredImage: "/mukalim/articles/art-staranise.jpg",
      title: lt("Anis Étoilé : L'Aide Digestive", "Star Anise: The Digestive Aid", "", ""),
      excerpt: lt(
        "Explorez l'usage traditionnel de l'anis étoilé pour apaiser la digestion, et les composés aromatiques à l'origine de sa réputation thérapeutique.",
        "Explore the traditional use of star anise in soothing digestion, and the aromatic compounds behind its therapeutic reputation.",
        "",
        "",
      ),
      body: lt(
        "Explorez l'usage traditionnel de l'anis étoilé pour apaiser la digestion, et les composés aromatiques à l'origine de sa réputation thérapeutique.",
        [
          "This star-shaped pod, native to southern China, carries an anise-like sweetness driven by anethole, the same aromatic compound found in fennel and licorice root.",
          "Traditionally brewed as a tea after meals, star anise has long been used to ease digestive discomfort and bloating, a use consistent with anethole's documented carminative effects.",
          "It's also the source of shikimic acid, a compound with broader pharmaceutical significance, underscoring how much modern medicine still draws from traditional botanical knowledge.",
          "A single pod steeped in hot water is often all it takes to experience the aromatic warmth this spice has offered for centuries.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Anis Étoilé : L'Aide Digestive", "Star Anise: The Digestive Aid", "", ""),
      seoDescription: lt(
        "Explorez l'usage traditionnel de l'anis étoilé pour apaiser la digestion.",
        "Explore the traditional use of star anise in soothing digestion.",
        "",
        "",
      ),
    },
    {
      slug: "ashwagandha-the-adaptogen-herb",
      category: "impact-of-therapeutic-treatment",
      tag: "Herb",
      status: "published" as const,
      author: "Jordan Lee",
      publishedAt: "2026-07-31",
      featuredImage: "/mukalim/articles/art-ashwagandha.jpg",
      title: lt("Ashwagandha : La Plante Adaptogène", "Ashwagandha: The Adaptogen Herb", "", "Ashwagandha: L'Erba Adattogena"),
      excerpt: lt(
        "Explorez la science derrière cet adaptogène vénéré et son rôle traditionnel dans le soutien de la réponse du corps au stress.",
        "Unpack the science behind this revered adaptogen and its traditional role in supporting the body's response to stress.",
        "",
        "",
      ),
      body: lt(
        "Explorez la science derrière cet adaptogène vénéré et son rôle traditionnel dans le soutien de la réponse du corps au stress.",
        [
          "Ashwagandha has anchored Ayurvedic medicine for over 3,000 years, classified as a rasayana — a category of herbs traditionally used to promote vitality and resilience over time.",
          "In contemporary terms, it's best known as an adaptogen: a class of botanicals studied for their potential to help the body maintain balance under stress, rather than targeting a single symptom.",
          "The root, rather than the leaf, carries the withanolides most associated with ashwagandha's traditional use — which is why quality preparations specify root-only sourcing.",
          "It's a slow-acting herb by design, traditionally taken consistently over weeks rather than as a one-time remedy — patience being very much part of its use.",
        ].join("\n\n"),
        "",
        "",
      ),
      seoTitle: lt("Ashwagandha : La Plante Adaptogène", "Ashwagandha: The Adaptogen Herb", "", ""),
      seoDescription: lt(
        "Explorez la science derrière cet adaptogène vénéré.",
        "Unpack the science behind this revered adaptogen.",
        "",
        "",
      ),
    },
  ];

  for (const c of contentSeeds) {
    const [row] = await db
      .insert(contentItems)
      .values({
        categoryId: categoryIdBySlug.get(c.category)!,
        slug: c.slug,
        tag: c.tag,
        featuredImageUrl: c.featuredImage,
        status: c.status,
        authorId: authorIdByName[c.author],
        publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
      })
      .returning();
    if (!row) throw new Error(`Failed to seed content item '${c.slug}'.`);

    await db.insert(contentTranslations).values(
      (["fr", "en", "de", "it"] as const).map((locale) => ({
        contentId: row.id,
        locale,
        title: c.title[locale],
        excerpt: c.excerpt[locale],
        body: c.body[locale],
        seoTitle: c.seoTitle[locale],
        seoDescription: c.seoDescription[locale],
      })),
    );
  }
  console.log(`  content items: ${contentSeeds.length}`);

  // --- media ---
  const mediaSeeds = [
    { filename: "logo.png", url: "/mukalim/logo.png", sizeKb: 1, width: 80, height: 80, alt: lt("Logo de la marque Mukalim", "Mukalim brand logo", "Mukalim Markenlogo", "Logo del marchio Mukalim") },
    { filename: "hero.jpg", url: "/mukalim/hero.jpg", sizeKb: 1500, width: 2400, height: 3600, alt: lt("Vue aérienne de bols remplis d'épices colorées", "Overhead view of bowls filled with colorful spices", "", "") },
    { filename: "card-cosmetics.jpg", url: "/mukalim/card-cosmetics.jpg", sizeKb: 268, width: 1400, height: 804, alt: lt("Bocaux d'extraits d'herbes séchées", "Glass jars of dried herbal extracts", "", "") },
    { filename: "card-hygiene.jpg", url: "/mukalim/card-hygiene.jpg", sizeKb: 354, width: 1400, height: 2100, alt: lt("Comptoir de cuisine propre et moderne", "A clean, modern kitchen counter", "Sauberer, moderner Küchentresen", "") },
    { filename: "card-safety.jpg", url: "/mukalim/card-safety.jpg", sizeKb: 195, width: 1400, height: 1867, alt: lt("Bâtons de cannelle et épices séchées", "Cinnamon sticks and dried spices", "", "Bastoncini di cannella e spezie essiccate") },
    { filename: "trust.jpg", url: "/mukalim/trust.jpg", sizeKb: 230, width: 1600, height: 1067, alt: lt("Mains ridées broyant des épices dans un mortier", "Weathered hands grinding spices with a mortar and pestle", "Verwitterte Hände zerstoßen Gewürze mit Mörser und Stößel", "") },
    { filename: "cosmetics-hero.jpg", url: "/mukalim/articles/cosmetics-hero.jpg", sizeKb: 1273, width: 2000, height: 3000, alt: lt("Bouquets de plantes séchées suspendus à un étal de marché", "Bundles of dried botanicals hanging at a market stall", "", "") },
    { filename: "fb-hero.jpg", url: "/mukalim/articles/fb-hero.jpg", sizeKb: 1607, width: 2000, height: 3000, alt: lt("Une ruelle couverte d'un marché aux épices", "A covered alley in a spice market lined with stalls", "Eine überdachte Gasse auf einem Gewürzmarkt", "") },
    { filename: "art-turmeric.jpg", url: "/mukalim/articles/art-turmeric.jpg", sizeKb: 308, width: 1000, height: 1778, alt: lt("Tas d'épices colorées moulues sur un marché", "Piles of colorful ground spices at a spice market", "", "Mucchi di spezie macinate colorate al mercato") },
    { filename: "art-cardamom.jpg", url: "/mukalim/articles/art-cardamom.jpg", sizeKb: 91, width: 1000, height: 669, alt: lt("Un tas de gousses de cardamome séchées", "A pile of dried cardamom pods", "Ein Haufen getrockneter Kardamomkapseln", "") },
    { filename: "art-matcha.jpg", url: "/mukalim/articles/art-matcha.jpg", sizeKb: 153, width: 1000, height: 1499, alt: lt("Poudre de matcha avec fouet en bambou", "Matcha powder with a bamboo whisk and chopsticks", "", "") },
    { filename: "art-aloe.jpg", url: "/mukalim/articles/art-aloe.jpg", sizeKb: 66, width: 1000, height: 667, alt: lt("Gros plan de feuilles d'aloe vera", "Close-up of aloe vera plant leaves", "Nahaufnahme von Aloe-Vera-Blättern", "") },
    { filename: "art-eucalyptus.jpg", url: "/mukalim/articles/art-eucalyptus.jpg", sizeKb: 64, width: 1000, height: 1500, alt: lt("Branche d'eucalyptus sur fond neutre", "Eucalyptus branch against a neutral backdrop", "", "Ramo di eucalipto su sfondo neutro") },
    { filename: "art-lavender.jpg", url: "/mukalim/articles/art-lavender.jpg", sizeKb: 117, width: 1000, height: 667, alt: lt("Un bouquet de fleurs de lavande séchées", "A bundle of dried lavender flowers", "", "") },
    { filename: "art-kitchen.jpg", url: "/mukalim/articles/art-kitchen.jpg", sizeKb: 92, width: 1000, height: 667, alt: lt("Cuisine propre et moderne avec armoires", "A clean, modern kitchen counter and cabinetry", "Saubere, moderne Küche mit Schränken", "") },
    { filename: "art-jarshelf.jpg", url: "/mukalim/articles/art-jarshelf.jpg", sizeKb: 166, width: 1000, height: 667, alt: lt("Rangées de bocaux d'apothicaire sur une étagère", "Rows of glass apothecary jars on a shelf", "", "") },
    { filename: "art-essentialoil.jpg", url: "/mukalim/articles/art-essentialoil.jpg", sizeKb: 55, width: 1000, height: 667, alt: lt("Une main tenant une petite bouteille d'huile essentielle", "A hand holding a small bottle of essential oil", "", "Una mano che tiene una piccola bottiglia di olio essenziale") },
    { filename: "art-lab.jpg", url: "/mukalim/articles/art-lab.jpg", sizeKb: 87, width: 1000, height: 627, alt: lt("Un technicien de laboratoire testant des échantillons", "A lab technician testing samples with a pipette", "Ein Labortechniker testet Proben mit einer Pipette", "") },
    { filename: "art-farmer.jpg", url: "/mukalim/articles/art-farmer.jpg", sizeKb: 171, width: 1000, height: 667, alt: lt("Un agriculteur travaillant dans un champ vert", "A farmer working in a green field", "", "") },
    { filename: "art-pantryjars.jpg", url: "/mukalim/articles/art-pantryjars.jpg", sizeKb: 315, width: 1000, height: 1500, alt: lt("Rangées de bocaux étiquetés de conserves", "Rows of labeled jars of preserved foods", "", "File di barattoli etichettati di conserve") },
    { filename: "art-ginger.jpg", url: "/mukalim/articles/art-ginger.jpg", sizeKb: 241, width: 1000, height: 1500, alt: lt("Un tas de racines de gingembre frais", "A pile of fresh ginger root", "Ein Haufen frischer Ingwerwurzeln", "") },
    { filename: "art-staranise.jpg", url: "/mukalim/articles/art-staranise.jpg", sizeKb: 168, width: 1000, height: 667, alt: lt("Gros plan de gousses d'anis étoilé entières", "Close-up of whole star anise pods", "", "") },
    { filename: "art-ashwagandha.jpg", url: "/mukalim/articles/art-ashwagandha.jpg", sizeKb: 81, width: 1000, height: 662, alt: lt("Feuilles vertes de la plante ashwagandha", "Green ashwagandha plant leaves", "Grüne Blätter der Ashwagandha-Pflanze", "") },
  ];

  for (const m of mediaSeeds) {
    const [row] = await db
      .insert(media)
      .values({ filename: m.filename, url: m.url, sizeKb: m.sizeKb, width: m.width, height: m.height, uploadedBy: amara.id })
      .returning();
    if (!row) throw new Error(`Failed to seed media '${m.filename}'.`);

    await db.insert(mediaTranslations).values(
      (["fr", "en", "de", "it"] as const).map((locale) => ({ mediaId: row.id, locale, altText: m.alt[locale] })),
    );
  }
  console.log(`  media: ${mediaSeeds.length}`);

  // --- activity log ---
  const activitySeeds = [
    { actor: amara, action: "published", target: "'Turmeric: The Golden Healer'", at: "2026-09-01T06:30:00Z" },
    { actor: jordan, action: "updated the", target: "Cosmetics category", at: "2026-09-01T04:15:00Z" },
    { actor: jordan, action: "set to draft", target: "'Star Anise: The Digestive Aid'", at: "2026-08-31T14:50:00Z" },
    { actor: amara, action: "uploaded 3 new images to", target: "Media Library", at: "2026-08-31T09:05:00Z" },
    { actor: amara, action: "invited", target: "Priya Nair as Editor", at: "2026-08-30T17:40:00Z" },
    { actor: jordan, action: "updated", target: "'HACCP Explained: Our Quality Framework'", at: "2026-08-29T13:22:00Z" },
    { actor: amara, action: "set to inactive the", target: "Impact of Therapeutic Treatment category", at: "2026-08-26T10:10:00Z" },
  ];

  await db.insert(activityLog).values(
    activitySeeds.map((a) => ({
      actorUserId: a.actor.id,
      actorRole: a.actor.role,
      action: a.action,
      targetLabel: a.target,
      createdAt: new Date(a.at),
    })),
  );
  console.log(`  activity log: ${activitySeeds.length}`);

  // --- settings ---
  await db.insert(settings).values({
    id: 1,
    siteName: "Mukalim",
    defaultLanguage: "en",
    contactEmail: "hello@mukalim.com",
    socialInstagram: "https://instagram.com/mukalim",
    socialFacebook: "https://facebook.com/mukalim",
    socialLinkedin: "https://linkedin.com/company/mukalim",
  });
  console.log("  settings: 1 row");

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
