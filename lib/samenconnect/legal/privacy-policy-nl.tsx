import type { ReactNode } from "react";
import Link from "next/link";
import { LegalP, LegalSection, LegalUl } from "@/components/samenconnect/legal-document-layout";

export function PrivacyPolicyNlBody(): ReactNode {
  return (
    <>
      <LegalSection title="1. Inleiding">
        <LegalP>
          SamenConnect (&quot;wij&quot;, &quot;ons&quot;, &quot;het platform&quot;) respecteert uw privacy en verwerkt
          persoonsgegevens zorgvuldig en in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG) en
          andere toepasselijke privacywetgeving.
        </LegalP>
        <LegalP>
          Dit privacybeleid beschrijft welke gegevens wij verwerken, waarom, hoe lang, met wie wij deze delen en welke
          rechten u heeft. Lees dit beleid samen met onze{" "}
          <Link href="/terms" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            Algemene voorwaarden
          </Link>
          , waarin onder meer de aard van onze dienst als bemiddelingsplatform staat beschreven.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. Verwerkingsverantwoordelijke">
        <LegalP>
          Voor de verwerking van persoonsgegevens in het kader van het platform is de beslissende partij (de
          verwerkingsverantwoordelijke in de zin van de AVG) de rechtspersoon achter SamenConnect, zoals vermeld op de
          website en in gebruikerscommunicatie. Voor privacyvragen kunt u contact opnemen via{" "}
          <a href="mailto:info@samenconnect.nl" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            info@samenconnect.nl
          </a>
          .
        </LegalP>
      </LegalSection>

      <LegalSection title="3. Belangrijk: SamenConnect is geen zorgaanbieder">
        <LegalP>
          SamenConnect is een <strong>online marktplaats en communicatieplatform</strong> waar zorgvragers (clients),
          zorgverleners (caregivers) en in voorkomend geval organisaties elkaar kunnen vinden, profielen kunnen tonen,
          opdrachten kunnen plaatsen of reageren, en — waar de functionaliteit dit toelaat — met elkaar kunnen
          communiceren.
        </LegalP>
        <LegalP>
          <strong>Wij verlenen geen zorg</strong> en zijn geen partij bij de inhoudelijke zorgovereenkomst tussen
          gebruikers. De verantwoordelijkheid voor de kwaliteit, veiligheid en rechtmatigheid van zorg en voor de
          naleving van beroeps- en sectorregelgeving (zoals waar van toepassing de Wet kwaliteit, klachten en geschillen
          zorg) ligt bij de betrokken zorgverlener en/of zorgaanbieder en bij de zorgvrager, niet bij SamenConnect.
        </LegalP>
        <LegalP>
          Dit onderscheid is van belang voor zowel aansprakelijkheid als voor de aard van de gegevens die via het
          platform kunnen worden uitgewisseld: gebruikers delen informatie met elkaar op eigen verantwoordelijkheid,
          binnen de kaders die het platform technisch mogelijk maakt.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. Welke persoonsgegevens verwerken wij?">
        <LegalP>Wij kunnen onder meer de volgende categorieën persoonsgegevens verwerken:</LegalP>
        <LegalUl
          items={[
            "Account- en identificatiegegevens: naam, e-mailadres, wachtwoordhash, gebruikers-ID, rol (client, zorgverlener, organisatie, beheerder), taalvoorkeur en accountstatus.",
            "Profiel- en marktplaatsgegevens: weergavenaam, foto, beschrijving, vaardigheden, beschikbaarheid, locatie- of regio-informatie, tariefindicaties, portfolio-elementen en overige door u ingevulde profielvelden.",
            "Transactie- en gebruiksgegevens: geplaatste opdrachten of intake, sollicitaties, matches, favorieten, reviews, notificaties, logboeken van beveiligings- en technische gebeurtenissen (zoals IP-adres en tijdstip bij misbruiksignalering) en overige interactie met het platform.",
            "Communicatie: berichten, bijlagen en metadata (bijvoorbeeld tijdstip, deelnemers) voor zover deze via het platform worden uitgewisseld.",
            "Betaal- en facturatiegegevens: waar van toepassing gegevens die nodig zijn voor abonnementen, facturatie of betalingsverkeer (bijvoorbeeld via Stripe), zoals factuuradres, BTW-identificatie en transactie-ID’s. Wij verwerken geen volledige kaartnummers; betalingen lopen typisch via gecertificeerde betaalproviders.",
            "Klantenservice: inhoud van supporttickets en correspondentie met ons.",
            "Compliance: gegevens die nodig zijn om wettelijke verplichtingen na te komen of misbruik te voorkomen (bijvoorbeeld bewaarplicht, fraudebestrijding).",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Bijzondere en/of gevoelige gegevens">
        <LegalP>
          In zorgcontexten kunnen gebruikers <strong>bijzondere persoonsgegevens</strong> (bijvoorbeeld over gezondheid)
          delen, bijvoorbeeld in een opdrachtomschrijving, intake of chat. Dergelijke gegevens worden in de regel alleen
          verwerkt omdat gebruikers deze <strong>zelf invoeren of verzenden</strong> in het kader van het platform en
          van de relatie tussen zorgvrager en zorgverlener.
        </LegalP>
        <LegalP>
          Wij vragen u om zorgvuldig na te gaan welke informatie strikt noodzakelijk is en om geen overbodige
          gezondheidsinformatie te delen. Waar mogelijk biedt het platform structuur (bijvoorbeeld velden of
          taxonomieën) om informatie te beperken tot wat redelijkerwijs nodig is voor matching of communicatie.
        </LegalP>
        <LegalP>
          Voor zover wij bijzondere persoonsgegevens als verwerkingsverantwoordelijke verwerken, doen wij dat in
          overeenstemming met de AVG, op basis van door de wet toegestane grondslagen (zoals uitdrukkelijke toestemming
          waar vereist, of — waar van toepassing — verwerking die noodzakelijk is voor het substantiële belang van de
          betrokkene bij de uitoefening van rechten op het gebied van arbeid en sociale zekerheid en sociale
          bescherming, in combinatie met passende waarborgen zoals bedoeld in de wet- en regelgeving).
        </LegalP>
      </LegalSection>

      <LegalSection title="6. Doeleinden en rechtsgronden">
        <LegalP>Wij verwerken persoonsgegevens onder meer voor de volgende doeleinden:</LegalP>
        <LegalUl
          items={[
            "Het leveren, beveiligen en verbeteren van het platform (uitvoering van de gebruikersovereenkomst; gerechtvaardigd belang bij een veilige en bruikbare dienst).",
            "Authenticatie, autorisatie en rolgebaseerde toegang (uitvoering overeenkomst; wettelijke verplichting waar van toepassing).",
            "Matching, zoeken, notificaties en overige kernfunctionaliteit (uitvoering overeenkomst; gerechtvaardigd belang bij relevante suggesties, met inachtneming van gebruikersinstellingen).",
            "Klantenservice en geschillenafhandeling tussen gebruikers en jegens SamenConnect (uitvoering overeenkomst; gerechtvaardigd belang).",
            "Facturatie en incasso (uitvoering overeenkomst; wettelijke verplichting, bijvoorbeeld fiscale bewaarplicht).",
            "Analyseren van gebruik in geaggregeerde of pseudoniene vorm om het product te verbeteren (gerechtvaardigd belang; waar nodig toestemming voor niet-essentiële cookies of tracking).",
            "Detectie en voorkoming van misbruik, fraude en beveiligingsincidenten (gerechtvaardigd belang; wettelijke verplichting).",
            "Naleving van wettelijke verplichtingen en verzoeken van bevoegde autoriteiten.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Delen met derden (verwerkers en partners)">
        <LegalP>
          Wij verkopen uw persoonsgegevens niet. Wij kunnen gegevens delen met zorgvuldig geselecteerde
          <strong> dienstverleners (verwerkers)</strong>, zoals hosting- en cloudproviders, e-mailleveranciers,
          analytics- of supporttools, en betaalproviders, uitsluitend voor zover dat nodig is voor de hierboven
          beschreven doeleinden. Met verwerkers sluiten wij waar vereist verwerkersovereenkomsten af conform artikel 28
          AVG.
        </LegalP>
        <LegalP>
          Gegevens die u <strong>zichtbaar maakt voor andere gebruikers</strong> (bijvoorbeeld profielinformatie,
          opdrachtteksten, berichten) worden binnen het platform aan die gebruikers getoond. U bepaalt — binnen de
          grenzen van de aangeboden functionaliteit — in belangrijke mate welke informatie u publiceert.
        </LegalP>
        <LegalP>
          Een deel van onze verwerkers kan buiten de Europese Economische Ruimte (EER) zijn gevestigd. In dat geval
          waarborgen wij passende overdrachtsmechanismen, zoals de EU Standard Contractual Clauses of een adequaatheidsbesluit
          van de Europese Commissie, tenzij een specifieke uitzondering van toepassing is.
        </LegalP>
      </LegalSection>

      <LegalSection title="8. Bewaartermijnen">
        <LegalP>
          Wij bewaren persoonsgegevens niet langer dan redelijkerwijs nodig is voor de doeleinden waarvoor zij zijn
          verzameld, tenzij een langere bewaarplicht uit de wet voortvloeit (bijvoorbeeld fiscale administratie).
        </LegalP>
        <LegalP>
          Accountgegevens worden in beginsel bewaard gedurende de looptijd van uw account en daarna gedurende een
          beperkte periode voor back-ups, geschillen en compliance. Inhoudelijke zorg- of opdrachtgegevens kunnen,
          afhankelijk van de aard van de relatie tussen gebruikers, door die gebruikers zelf langer relevant blijven;
          wij hanteren technische en organisatorische maatregelen om ongeautoriseerde toegang te beperken en — waar de
          functionaliteit dit toelaat — verwijdering of anonimisering na beëindiging van het account of na een
          redelijke termijn te faciliteren, zonder afbreuk te doen aan wettelijke bewaarplichten.
        </LegalP>
      </LegalSection>

      <LegalSection title="9. Beveiliging">
        <LegalP>
          Wij treffen passende technische en organisatorische maatregelen om persoonsgegevens te beschermen tegen
          verlies, ongeautoriseerde toegang, wijziging of openbaarmaking. Denk aan versleuteling in transit (TLS),
          toegangscontrole, logging, principle of least privilege voor beheerdersaccounts en periodieke evaluatie van
          onze beveiliging.
        </LegalP>
        <LegalP>
          Geen enkele methode van verzending of opslag is volledig veilig. Indien zich een datalek voordoet waarbij
          waarschijnlijk risico voor personen ontstaat, handelen wij in overeenstemming met de AVG (waaronder melding
          aan de toezichthouder en, indien van toepassing, aan betrokkenen).
        </LegalP>
      </LegalSection>

      <LegalSection title="10. Geautomatiseerde besluitvorming en profiling">
        <LegalP>
          Het platform kan algoritmen of scores gebruiken om matches of suggesties te rangschikken. Dit is bedoeld als
          <strong> ondersteuning</strong> van uw keuzes, niet als vervanging van professioneel oordeel. Wij streven ernaar
          transparant te zijn over de factoren die een rol spelen (bijvoorbeeld afstand, beschikbaarheid, voorkeuren) en
          waar de wet dat vereist, bieden wij mogelijkheden tot menselijke tussenkomst of bezwaar.
        </LegalP>
      </LegalSection>

      <LegalSection title="11. Cookies en vergelijkbare technieken">
        <LegalP>
          Wij gebruiken cookies en vergelijkbare technieken die noodzakelijk zijn voor authenticatie, beveiliging en
          basisfunctionaliteit van het platform. Waar wij aanvullende, niet-strikt-noodzakelijke cookies of vergelijkbare
          tracking inzetten, vragen wij — waar wettelijk verplicht — uw voorafgaande toestemming via een cookiebanner of
          instellingenpagina.
        </LegalP>
      </LegalSection>

      <LegalSection title="12. Uw privacyrechten">
        <LegalP>Onder voorbehoud van de voorwaarden van de AVG heeft u onder meer de volgende rechten:</LegalP>
        <LegalUl
          items={[
            "Recht op inzage in de over u verwerkte persoonsgegevens;",
            "Recht op rectificatie van onjuiste gegevens;",
            "Recht op wissing (“recht om vergeten te worden”) voor zover wij niet gehouden zijn gegevens te bewaren;",
            "Recht op beperking van de verwerking in bepaalde situaties;",
            "Recht op dataportabiliteit voor zover de verwerking op basis van toestemming of contract gebeurt en geautomatiseerd is;",
            "Recht van bezwaar tegen verwerking op basis van gerechtvaardigd belang, tenzij wij dwingende gerechtvaardigde gronden hebben;",
            "Recht om toestemming in te trekken, voor zover de verwerking op toestemming is gebaseerd, zonder afbreuk aan de rechtmatigheid van eerdere verwerking.",
          ]}
        />
        <LegalP>
          U kunt veel rechten zelf uitoefenen via uw accountinstellingen. Voor overige verzoeken kunt u contact opnemen
          via{" "}
          <a href="mailto:info@samenconnect.nl" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            info@samenconnect.nl
          </a>
          . Wij reageren binnen de wettelijke termijnen (in beginsel binnen één maand, met mogelijke verlenging onder
          voorwaarden van de AVG).
        </LegalP>
      </LegalSection>

      <LegalSection title="13. Klacht bij de toezichthouder">
        <LegalP>
          Indien u van mening bent dat wij uw gegevens niet correct verwerken, verzoeken wij u eerst contact met ons op
          te nemen. Daarnaast heeft u het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens (AP) of — indien
          u in een andere EU-lidstaat woont — bij de lokale toezichthouder.
        </LegalP>
      </LegalSection>

      <LegalSection title="14. Wijzigingen van dit privacybeleid">
        <LegalP>
          Wij kunnen dit privacybeleid van tijd tot tijd bijwerken, bijvoorbeeld bij nieuwe functionaliteit of
          wetgeving. De actuele versie is steeds beschikbaar op deze pagina met vermelding van de datum “laatst
          bijgewerkt”. Bij wezenlijke wijzigingen streven wij ernaar u te informeren via het platform of per e-mail.
        </LegalP>
      </LegalSection>
    </>
  );
}
