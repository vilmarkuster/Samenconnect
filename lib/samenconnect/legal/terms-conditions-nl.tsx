import type { ReactNode } from "react";
import Link from "next/link";
import { LegalP, LegalSection, LegalUl } from "@/components/samenconnect/legal-document-layout";

export function TermsConditionsNlBody(): ReactNode {
  return (
    <>
      <LegalSection title="1. Partijen en toepasselijkheid">
        <LegalP>
          Deze algemene voorwaarden (&quot;Voorwaarden&quot;) zijn van toepassing op het gebruik van de website,
          applicaties en aanverwante diensten van SamenConnect (&quot;SamenConnect&quot;, &quot;wij&quot;, &quot;ons&quot;),
          inclusief maar niet beperkt tot registratie, inloggen, profielen, opdrachten, matching, berichten en
          beheerfunctionaliteit (gezamenlijk: het &quot;Platform&quot;).
        </LegalP>
        <LegalP>
          Door een account aan te maken, in te loggen of het Platform anderszins te gebruiken, verklaart u akkoord te
          gaan met deze Voorwaarden en met ons{" "}
          <Link href="/privacy" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            Privacybeleid
          </Link>
          . Indien u namens een rechtspersoon handelt, verklaart u bevoegd te zijn om die rechtspersoon te binden.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. Aard van de dienst — SamenConnect is een platform">
        <LegalP>
          SamenConnect is een <strong>online marktplaats en communicatiemiddel</strong> waar zorgvragers (&quot;clients&quot;),
          zorgverleners (&quot;caregivers&quot;) en, waar van toepassing, organisaties elkaar kunnen vinden, informatie kunnen
          uitwisselen en — afhankelijk van de functionaliteit — opdrachten of sollicitaties kunnen plaatsen of
          beheren.
        </LegalP>
        <LegalP>
          <strong>SamenConnect is geen zorgaanbieder</strong> en treedt niet op als werkgever, uitzendbureau,
          zorgverzekeraar of behandelaar. Wij bieden geen medische diagnoses, behandelingen of verpleging. Alle
          inhoudelijke zorg en professionele beslissingen blijven voorbehouden aan de betrokken zorgverleners en
          zorgvragers (en eventuele organisaties waarmee zij contractueel verbonden zijn).
        </LegalP>
      </LegalSection>

      <LegalSection title="3. Geen zorgovereenkomst met SamenConnect">
        <LegalP>
          Eventuele overeenkomsten over zorg, ondersteuning, tarieven, planning, aansprakelijkheid of uitvoering komen
          <strong> uitsluitend tot stand tussen gebruikers onderling</strong> (of tussen gebruikers en derden buiten het
          Platform), voor zover partijen dat zelf overeenkomen. SamenConnect faciliteert hooguit de totstandkoming van
          contact of informatie-uitwisseling, maar is geen partij bij die overeenkomsten.
        </LegalP>
        <LegalP>
          Niets op het Platform mag worden uitgelegd als een aanbeveling, goedkeuring of certificering door SamenConnect
          van een individuele zorgverlener, tenzij dit uitdrukkelijk en feitelijk juist als zodanig is aangegeven in
          aparte, expliciete communicatie.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. Accounts, rollen en leeftijd">
        <LegalP>
          U verstrekt juiste en actuele informatie bij registratie en houdt uw gegevens bij. U bent zelf
          verantwoordelijk voor het geheim houden van uw inloggegevens en voor alle activiteiten die via uw account
          plaatsvinden, tenzij u redelijkerwijs kunt aantonen dat misbruik buiten uw schuld is ontstaan.
        </LegalP>
        <LegalP>
          Het Platform kent rollen (onder meer client, zorgverlener, organisatie, beheerder). Functionaliteit en
          zichtbaarheid van gegevens kunnen per rol verschillen. U mag rollen of accounts niet op frauduleuze wijze
          combineren of misbruiken.
        </LegalP>
        <LegalP>
          Voor zorgverleners en organisaties gelden aanvullende verwachtingen ten aanzien van professionaliteit en
          naleving van toepasselijke wet- en regelgeving. Het Platform is niet bedoeld voor minderjarigen zonder
          toestemming van een wettelijke vertegenwoordiger waar dat wettelijk vereist is.
        </LegalP>
      </LegalSection>

      <LegalSection title="5. Toegestaan en verboden gebruik">
        <LegalP>Het is niet toegestaan om het Platform te gebruiken op een wijze die:</LegalP>
        <LegalUl
          items={[
            "in strijd is met wet- of regelgeving, openbare orde of goede zeden;",
            "rechten van anderen schendt, waaronder privacy, intellectuele eigendomsrechten of persoonlijke levenssfeer;",
            "misleidend, discriminerend, bedreigend, haatdragend, seksueel grensoverschrijdend of anderszins ongepast is in een zorgcontext;",
            "virussen, malware of schadelijke code verspreidt of beveiligingsmaatregelen omzeilt;",
            "automatisering (scraping, bots) inzet om het Platform onevenredig te belasten of gegevens systematisch te extraheren zonder voorafgaande schriftelijke toestemming van SamenConnect;",
            "identiteit of kwalificaties vervalst of reviews manipuleert.",
          ]}
        />
        <LegalP>
          SamenConnect mag technische en organisatorische maatregelen nemen om misbruik te voorkomen, waaronder
          beperking, schorsing of beëindiging van accounts en verwijdering van inhoud.
        </LegalP>
      </LegalSection>

      <LegalSection title="6. Gebruikersinhoud en licentie">
        <LegalP>
          U behoudt het intellectuele eigendom op inhoud die u op het Platform plaatst (&quot;Gebruikersinhoud&quot;). Door
          Gebruikersinhoud te plaatsen, verleent u SamenConnect een <strong>niet-exclusieve, royaltyvrije, overdraagbare
          licentie</strong> om die inhoud te hosten, op te slaan, te reproduceren, aan te passen (bijvoorbeeld voor
          weergave op verschillende apparaten), te verwerken en te tonen, uitsluitend voor het exploiteren, beveiligen en
          verbeteren van het Platform en voor naleving van wettelijke verplichtingen.
        </LegalP>
        <LegalP>
          U staat in voor het recht om Gebruikersinhoud te delen en vrijwaart SamenConnect voor claims van derden die
          voortvloeien uit uw Gebruikersinhoud.
        </LegalP>
      </LegalSection>

      <LegalSection title="7. Opdrachten, sollicitaties, berichten en reviews">
        <LegalP>
          Gebruikers zijn zelf verantwoordelijk voor de juistheid van opdrachtomschrijvingen, profielen, tarieven,
          planning en uitvoering. Berichten via het Platform zijn in beginsel privé tussen deelnemers, maar kunnen door
          SamenConnect worden verwerkt zoals beschreven in het Privacybeleid (bijvoorbeeld voor beveiliging,
          geschillenafhandeling of wettelijke verplichting).
        </LegalP>
        <LegalP>
          Reviews dienen waarheidsgetrouw en zakelijk te zijn. Het plaatsen van valse of misleidende reviews is verboden.
          SamenConnect kan moderatie-instrumenten inzetten of ontwikkelen; tot die tijd kunnen beperkte moderatieopties
          gelden zoals vermeld in de gebruikersinterface.
        </LegalP>
      </LegalSection>

      <LegalSection title="8. Betalingen en abonnementen">
        <LegalP>
          Voor zover het Platform betaalde abonnementen of andere betaalde diensten aanbiedt, gelden de op het moment van
          aankoop geldende prijzen en voorwaarden. Betalingen kunnen via externe betaalproviders verlopen. Facturatie- en
          belastingaspecten worden conform de toepasselijke wetgeving en de voorwaarden van die providers afgehandeld.
        </LegalP>
        <LegalP>
          Indien Stripe of een vergelijkbare dienst wordt gebruikt, kunnen aanvullende voorwaarden van die partij op u
          van toepassing zijn.
        </LegalP>
      </LegalSection>

      <LegalSection title="9. Intellectuele eigendom van SamenConnect">
        <LegalP>
          Het Platform, de merknaam SamenConnect, logo’s, software, documentatie en overige materialen van SamenConnect
          zijn beschermd door intellectuele eigendomsrechten. U verkrijgt uitsluitend een beperkte, niet-exclusieve,
          niet-overdraagbare licentie om het Platform te gebruiken in overeenstemming met deze Voorwaarden. U mag geen
          broncode reverse-engineeren, behalve voor zover dwingend recht dit toestaat.
        </LegalP>
      </LegalSection>

      <LegalSection title="10. Beschikbaarheid, wijzigingen en onderhoud">
        <LegalP>
          Wij streven naar een bruikbaar Platform, maar garanderen geen ononderbroken beschikbaarheid of foutloze
          werking. Onderhoud, updates of omstandigheden buiten onze redelijke invloed kunnen tot beperkingen leiden.
        </LegalP>
        <LegalP>
          Wij kunnen functionaliteit toevoegen, wijzigen of intrekken. Wezenlijke wijzigingen in deze Voorwaarden zullen
          wij — waar redelijk — communiceren via het Platform of per e-mail. Voortgezet gebruik na ingang van wijzigingen
          kan gelden als aanvaarding, tenzij wettelijk anders vereist.
        </LegalP>
      </LegalSection>

      <LegalSection title="11. Duur en beëindiging">
        <LegalP>
          Deze Voorwaarden gelden zolang u het Platform gebruikt. U kunt uw account te allen tijde beëindigen via de
          daarvoor beschikbare functionaliteit of door contact met ons op te nemen. SamenConnect kan een account
          schorsen of beëindigen bij (vermoeden van) misbruik, risico voor anderen, niet-betaling of andere gewichtige
          redenen.
        </LegalP>
        <LegalP>
          Na beëindiging kunnen bepaalde gegevens nog worden bewaard zoals vereist door wet of gerechtvaardigde belangen
          (zie het Privacybeleid).
        </LegalP>
      </LegalSection>

      <LegalSection title="12. Aansprakelijkheid en vrijwaring">
        <LegalP>
          Voor zover wettelijk toegestaan, is de totale aansprakelijkheid van SamenConnect jegens u voor directe schade
          voortvloeiend uit of verband houdend met het Platform <strong>beperkt</strong> tot het bedrag dat u in de
          twaalf (12) maanden voorafgaand aan de gebeurtenis aan SamenConnect voor het Platform heeft betaald, of — indien
          u geen betalende diensten afneemt — tot <strong>maximaal honderd (100) euro</strong> per voorvallende reeks
          van samenhangende claims.
        </LegalP>
        <LegalP>
          <strong>Uitgesloten</strong> is iedere aansprakelijkheid voor indirecte schade, gevolgschade, gederfde winst,
          gemiste besparingen, reputatieschade, dataverlies of stagnatie in zorg, behalve voor zover dergelijke
          uitsluiting dwingendrechtelijk niet is toegestaan.
        </LegalP>
        <LegalP>
          SamenConnect is in geen geval aansprakelijk voor handelen of nalaten van gebruikers of derden, waaronder
          zorgverleners, zorgvragers, organisaties, leveranciers van zorg, verzekeraars of overheidsinstanties. U
          vrijwaart SamenConnect tegen claims van derden die verband houden met uw gebruik van het Platform, uw
          Gebruikersinhoud of uw relatie met andere gebruikers, voor zover deze niet het gevolg zijn van opzet of
          bewuste roekeloosheid van SamenConnect.
        </LegalP>
      </LegalSection>

      <LegalSection title="13. Overmacht">
        <LegalP>
          SamenConnect is niet gehouden tot nakoming van verplichtingen indien nakoming wordt verhinderd door
          overmacht, waaronder storingen bij hostingproviders, cyberaanvallen, overheidsmaatregelen, natuurrampen,
          stakingen of andere omstandigheden buiten redelijke invloed.
        </LegalP>
      </LegalSection>

      <LegalSection title="14. Geschillen en toepasselijk recht">
        <LegalP>
          Op deze Voorwaarden is Nederlands recht van toepassing. Geschillen worden bij voorkeur in onderling overleg
          opgelost. Indien dat niet lukt, zijn de bevoegde rechter(s) in Nederland bevoegd, tenzij dwingend
          consumentenrecht een andere rechter aanwijst.
        </LegalP>
      </LegalSection>

      <LegalSection title="15. Contact">
        <LegalP>
          Voor vragen over deze Voorwaarden kunt u contact opnemen via{" "}
          <a href="mailto:info@samenconnect.nl" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            info@samenconnect.nl
          </a>
          .
        </LegalP>
      </LegalSection>
    </>
  );
}
