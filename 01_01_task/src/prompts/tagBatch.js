// Descriptions help the model classify ambiguous jobs correctly.
const TAG_GUIDE = `
IT
  Dotyczy: programowanie, tworzenie oprogramowania, algorytmy, optymalizacja kodu, data science, systemy komputerowe, sieci, modelowanie i symulacje komputerowe, struktury danych.
  Przykłady opisów: "projektuje i implementuje struktury danych", "rozwiązuje problemy algorytmiczne", "tworzy modele predykcyjne", "optymalizuje wydajność systemów".
  Nie dotyczy: optymalizacja procesów fizycznych lub logistycznych bez użycia oprogramowania.

transport
  Dotyczy: fizyczne przemieszczanie towarów lub osób, logistyka, spedycja, kierowca (ciężarówka, autobus, taksówka, kurier), zarządzanie flotą pojazdów, magazynowanie i dystrybucja, planowanie i optymalizacja ruchu towarowego, łańcuch dostaw.
  Przykłady opisów: "usprawnia ruch towarowy", "projektuje rozwiązania dla przepływu towarów", "identyfikuje wąskie gardła w logistyce", "organizuje transport materiałów".
  Nie dotyczy: mechanik naprawiający pojazdy (to "praca z pojazdami"), policjant kontrolujący przewóz materiałów (to "praca z ludźmi"), programista optymalizujący algorytmy (to "IT").

edukacja
  Dotyczy: nauczanie, tutoring, szkolenia, praca w szkole lub uczelni, rozwijanie umiejętności innych, przekazywanie wiedzy, przygotowanie do życia zawodowego i społecznego.
  Przykłady opisów: "przekazuje wiedzę i kształtuje postawy", "motywuje do osiągania celów", "mediator między wiedzą a uczącymi się", "przygotowuje podopiecznych do życia zawodowego".
  Nie dotyczy: badania naukowe bez elementu nauczania.

medycyna
  Dotyczy: leczenie, diagnozowanie, pielęgniarstwo, farmacja, badania biomedyczne, biologia człowieka i zwierząt, rozwój leków i terapii, ochrona zdrowia, badanie mechanizmów chorób.
  Przykłady opisów: "diagnozuje i proponuje plan leczenia", "bada mechanizmy chorób", "pracuje nad nowymi lekami", "analizuje podziały komórkowe i różnicowanie tkanek", "bada wady wrodzone".
  Nie dotyczy: ogólne nauki przyrodnicze bez związku ze zdrowiem (fizyka, chemia przemysłowa).

praca z ludźmi
  Dotyczy: bezpośredni kontakt z ludźmi jako główna część pracy — obsługa klienta, HR, praca socjalna, doradztwo, recepcja, sprzedaż, zarządzanie zespołem, służby mundurowe (policja, straż, ochrona), egzekwowanie prawa wobec obywateli.
  Przykłady opisów: "zapewnia bezpieczeństwo obywateli", "egzekwuje przepisy wobec ludzi", "doradza i wspiera podopiecznych", "jest pierwszą osobą po którą sięgamy".
  Nie dotyczy: praca, gdzie kontakt z ludźmi jest incydentalny, a nie głównym zadaniem.

praca z pojazdami
  Dotyczy: mechaniczna obsługa, naprawa, serwisowanie lub operowanie pojazdami i maszynami — mechanik samochodowy, ciężarowy, lotniczy, operator maszyn budowlanych/ciężkich, serwis techniczny.
  Przykłady opisów: "diagnozuje usterki samochodów", "rozmontowuje i naprawia mechanizmy", "dba o sprawność pojazdów", "obsługuje maszyny wymagające interwencji manualnej".
  Nie dotyczy: kierowca przewożący towary (to "transport"), elektryk instalujący systemy (to "praca fizyczna").

praca fizyczna
  Dotyczy: manualna praca na miejscu — budownictwo, hydraulika, elektryka, stolarstwo, rzemiosło, instalacje techniczne, montaż urządzeń, prace serwisowe w terenie, ręczne składanie i sklejanie przedmiotów, wyrób ręczny, rękodzieło, produkcja manualna.
  Przykłady opisów: "naprawia cieknące krany i zatkane odpływy", "montuje systemy elektryczne", "obróbka drewna", "prace instalacyjne i serwisowe", "montaż oświetlenia i nagłośnienia", "skleja i składa przedmioty ręcznie", "ręcznie wytwarza wyroby", "wykonuje prace rękodzielnicze", "składa elementy w całość przy użyciu rąk".
  Nie dotyczy: praca przy biurku lub komputerze, praca stricte intelektualna.
`.trim();

/**
 * Builds the prompt for a batch of job descriptions.
 * items: array of { index: number, job: string }
 * returns: string
 */
export function buildTagPrompt(items) {
  const jobList = items.map(({ index, job }) => `${index}. ${job}`).join("\n");

  return [
    "Sklasyfikuj każdy poniższy opis stanowiska pracy, używając podanych tagów.",
    "Dla KAŻDEGO tagu podaj ocenę pewności od 0 do 100 — jak bardzo pasuje do tego stanowiska.",
    "Uwzględnij wszystkie 7 tagów w wyniku, nawet te z niską pewnością.",
    "Jedno stanowisko może silnie pasować do wielu tagów.",
    "",
    "Dostępne tagi:",
    TAG_GUIDE,
    "",
    "Opisy stanowisk:",
    jobList
  ].join("\n");
}
