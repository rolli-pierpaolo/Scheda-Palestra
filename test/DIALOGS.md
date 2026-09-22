# Dialoghi VIRIDIS

`js/dialogs.js` contiene solo componenti di presentazione. I chiamanti attendono la risposta con `await`, poi eseguono gli stessi salvataggi, calcoli e aggiornamenti precedenti.

## API

- `ViridisOptionPicker({title, message, choices, grid, hint})`: bottom sheet; ogni scelta ha `label` e `value`. Un tocco seleziona, senza input né conferma aggiuntiva. Annullamento: `null`.
- `ViridisConfirmDialog(message, options)`: conferma centrata; restituisce `true` o `false`. Le opzioni permettono di specificare `title`, `acceptLabel`, `cancelLabel` e `destructive`.
- `ViridisInputDialog(message, value, options)`: input in bottom sheet; `inputMode: 'decimal'` per numeri, `multiline` per backup, `readOnly` per copia manuale. `validate(value)` restituisce l'errore inline oppure una stringa vuota. Annullamento: `null`; stringa vuota e annullamento restano distinti.
- `ViridisWeeksPicker(message, selected)`: scelta diretta tra 1 e 12 settimane.
- `ViridisModal(message, options)`: messaggio importante con presa visione.
- `ViridisToast(message)`: feedback temporaneo in coda, testo non interpretato come HTML.
- `ViridisFieldError(input, message)`: errore inline per un campo esistente.

La gestione condivisa comprende coda dei dialoghi, protezione dai doppi tocchi, focus confinato, Escape, ripristino del focus e dello sfondo, viewport visiva, safe area, testo grande, contrasto alto, movimento ridotto e vibrazione. I select originali conservano value e onchange, mentre il controllo visibile apre il selettore VIRIDIS.

## Verifica eseguita

`npm test`: 61 test esistenti e 17 test dei nuovi dialoghi, tutti superati. Le API native nei test specifici lanciano un errore se chiamate.

Copertura: Max singoli/collegati, tentativi aggiuntivi e cascata, scelta dinamica e righe iniziali vuote, annullamento, rimozione con dati, archiviazione e azzeramenti, backup testuale/file e copia manuale, esercizi e undo, giorni, libreria, estensione settimane, riordino, bilanciere, RPE, cambio giornata, colori, select, focus, coda, vibrazione disabilitata e trattamento sicuro dei testi.

Verifica browser: 390×844, 320×568 e 844×390; selettore a 3 e 40 opzioni; testo grande, contrasto alto, animazioni ridotte; contenuto scorrevole, conferma distruttiva e input con errore inline. A 320 px il pannello misura 304 px e rimane entro i margini laterali; in orizzontale il pannello resta entro la viewport e scorre internamente.

La pagina `test/dialogs-preview.html` consente di ripetere la verifica dei componenti senza leggere o salvare allenamenti. Avviare `python -m http.server 8765 --bind 127.0.0.1` dalla radice e aprire `http://127.0.0.1:8765/test/dialogs-preview.html`.

La safe area usa `env(safe-area-inset-*)`. Il browser desktop non riproduce la Home Indicator, la tastiera o l'aptica fisica di iPhone: questi aspetti richiedono una verifica su dispositivo reale.

## Audit nativo

Nessuna chiamata applicativa a `alert`, `prompt` o `confirm` rimane. Le occorrenze residue sono nomi di funzioni personalizzate, commenti, classi CSS, banner di installazione e stub/test.

Restano le API del sistema operativo indispensabili alle funzioni esistenti: autorizzazione notifiche, condivisione e scelta file. Una pagina web non può sostituire quelle interfacce mantenendo gli stessi permessi e l'accesso ai file/app esterni. Nessuna modifica a database, schema dei dati, autenticazione o sincronizzazione.
