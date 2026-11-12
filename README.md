# Vinted Bookmark Notifier (Vinted Dashboard)

Un segnalibro intelligente (**Bookmarklet**) in JavaScript per monitorare in tempo reale le nuove inserzioni su [Vinted](https://www.vinted.it/), visualizzare i dettagli completi dei venditori e ricevere notifiche sonore personalizzabili all'arrivo di nuovi affari.

---

## 🚀 Caratteristiche Principali

- ⏱️ **Auto-Refresh in Tempo Reale**: Intervallo di aggiornamento configurabile (in secondi) con conto alla rovescia e comandi *Pausa / Riprendi* e *Aggiorna ora*.
- 🔔 **Notifiche Sonore Personalizzabili**: Segnale acustico sintetizzato tramite Web Audio API con campo numerico per impostare la durata esatta del suono (es. 2 secondi standard), senza necessità di file audio esterni.
- 🎯 **Filtri di Ricerca Avanzati**:
  - **Escludi parole chiave**: Scarta automaticamente annunci che contengono determinate parole (nel titolo o descrizione).
  - **Includi parole chiave**: Filtra solo annunci contenenti parole o frasi specifiche, con logica flessibile (*Almeno una* oppure *Tutte*).
  - **Reputazione Venditore**: Filtro per numero minimo di recensioni e punteggio minimo di stelle (es. 4.0+).
  - **Verifica Elettronica**: Filtro sperimentale per individuare annunci con verifica elettronica abilitata.
  - **Nascondi non verificabili**: Esclude annunci di cui non è possibile verificare l'affidabilità.
- 🗑️ **Gestione Annunci**:
  - Badge **NUOVO** per le inserzioni appena pubblicate.
  - Possibilità di nascondere manualmente singoli annunci con persistenza.
  - Visualizzazione del motivo di esclusione su ciascun annuncio nascosto.
  - Link rapido di acquisto diretto.
- 🌙 **Tema Dark ad Alto Contrasto**: Opzione per attivare lo sfondo nero profondo (`#000000`) e testo grigio, ideale per sessioni notturne.
- ⚡ **Affidabile & Leggero**: Utilizza il parsing HTML diretto senza dipendere da endpoint API privati o soggetti a blocchi 404; salva impostazioni e cache in `localStorage`.

---

## 📦 Struttura del Progetto

```
VintedBookmarkNotifier/
├── index.html                     # Pagina web pronta per GitHub Pages con generatore/copiatore del segnalibro
├── vinted-bookmark-notifier.html  # File HTML originale d'installazione
├── bookmarklet.js                 # Codice sorgente JavaScript non minificato
├── .gitignore                     # File ignorati da Git
└── README.md                      # Documentazione del progetto
```

---

## 🛠️ Come Installare ed Utilizzare

### Metodo 1: Tramite la Pagina HTML (Consigliato)

1. Apri il file [`index.html`](index.html) o [`vinted-bookmark-notifier.html`](vinted-bookmark-notifier.html) nel tuo browser preferito (Chrome, Firefox, Edge, Safari, Brave, ecc.).
2. Clicca sul pulsante **"Copia URL segnalibro"** (oppure trascina il link del segnalibro direttamente nella barra dei preferiti).
3. Apri la barra dei preferiti del tuo browser:
   - Fai click con il tasto destro sulla barra e seleziona **Aggiungi pagina...** o **Nuovo segnalibro**.
   - Dai un nome al preferito (es. `Vinted Dashboard`).
   - Nel campo **URL / Indirizzo**, incolla il codice copiato (che inizia con `javascript:...`).
4. Salva il segnalibro.

---

### Metodo 2: Creazione Manuale del Segnalibro

1. Copia l'intero contenuto di [`bookmarklet.js`](bookmarklet.js).
2. Aggiungi il prefisso `javascript:` e racchiudilo come funzione auto-eseguibile (o utilizza la stringa URL codificata presente nel file `index.html`).
3. Incollalo come indirizzo URL di un nuovo preferito nel browser.

---

## 🎮 Come si Usa

1. Accedi al sito di [Vinted](https://www.vinted.it) ed effettua l'accesso con il tuo account.
2. Effettua una ricerca o naviga in una categoria catalogo (l'URL conterrà `/catalog?...`).
3. Clicca sul preferito **Vinted Dashboard** appena creato nella barra dei segnalibri.
4. Si aprirà in sovrimpressione la dashboard con i controlli in alto e la griglia degli annunci:
   - **Ricerca**: Testo o URL di ricerca Vinted.
   - **Refresh (s)**: Frequenza di scansione in secondi (es. `30` o `60`).
   - **Primi**: Numero di annunci più recenti da monitorare.
   - **Rec. min / Stelle min**: Filtri sul feedback del venditore.
   - **Suono & Suono (s)**: Spunta per attivare l'avviso sonoro all'arrivo di nuovi annunci e definisci i secondi di durata. Clicca su *Prova suono* per verificare l'audio.
   - **Sfondo Nero**: Attiva il tema scuro.

> **Nota per l'Audio**: I browser moderni richiedono una prima interazione utente (un click su *Prova suono* o un tocco sulla schermata) per consentire l'avvio del sintetizzatore audio Web Audio API.

---

## ⚙️ Dettagli Tecnici

- **Nessuna dipendenza esterna**: Funziona con JavaScript nativo (ES6+), compatibile con tutti i browser moderni.
- **Web Audio API**: Il suono viene sintetizzato al volo combinando oscillatori audio (onde a triangolo e sinusoidali) senza caricare file `.mp3` o `.wav` remoti.
- **Cache intelligente**: Memorizza i dati degli annunci già analizzati con un TTL di 6 ore per minimizzare il traffico di rete e prevenire rate limiting.
- **HTML Fallback**: Parsing semantico tramite metadati `application/ld+json` e regex sui nodi HTML del catalogo Vinted.

---

## ⚠️ Disclaimer

Questo strumento è uno script client-side a solo scopo didattico e personale. Non è affiliato, sponsorizzato o approvato da Vinted. Usare responsabilmente rispettando i termini di servizio della piattaforma.

---

## 📄 Licenza

Distribuito sotto licenza MIT. Consulta il codice sorgente per maggiori dettagli.
