/* =========================================================
   Rishit's Stereo — tracks.js
   This is the only file you need to edit to add / change songs.

   Each song:
     title     – name shown in the player
     category  – Phonk | English | Spanish | Hindi | Gujarati | Instrumental | Devotional
     src       – link to the mp3 (leave "" if you don't have it yet)
     cover     – (optional) link or path to the cover picture.
                 Leave it out to show a green tile with the first letter.
   ========================================================= */

window.PLAYER_CONFIG = {
  // Where your songs live. The player reads every release of this repo,
  // so mp3s and cover images you upload there show up by themselves.
  github: {
    owner: 'Rishit-1010',
    repo: 'Music',
    releases: [],        // [] = all releases, or list tag names e.g. ['Music1', 'Covers']
    cacheMinutes: 10     // how long a visitor's browser remembers the list
  },

  // Cover images whose file names don't match a song title:
  //   'file name as shown in the release': 'Song title'
  coverMap: {
    // 'image.png': 'Montagem Alquimia',
  },

  // Fix a title the file name can't express (apostrophes, capitals...):
  //   'name as it appears in the file': 'Title you want'
  titles: {
    // 'KGF Mashup': 'KGF Mashup',
  },

  coverBase: '',
  coverExt: '.jpg'
};

(function () {
  var U = 'https://github.com/user-attachments/files/';

  window.TRACKS = [
    { title: 'Montagem Alquimia',            category: 'Phonk',        src: U + '33335716/MONTAGEM.ALQUIMIA.mp3' },
    { title: 'Montagem Coral',               category: 'Phonk',        src: U + '33335722/MONTAGEM.CORAL.mp3' },
    { title: 'Dia Delicia',                  category: 'Phonk',        src: U + '33335674/DIA.DELICIA.mp3' },
    { title: 'El Control',                   category: 'Phonk',        src: U + '33335675/EL.CONTROL.mp3' },
    { title: 'Luz Roja',                     category: 'Phonk',        src: U + '33335711/LUZ.ROJA.mp3' },
    { title: 'No Batidao',                   category: 'Phonk',        src: U + '33335746/NO.BATIDAO.mp3' },
    { title: 'Montagem Alucinante',          category: 'Phonk',        src: U + '33335718/MONTAGEM.ALUCINANTE.mp3' },
    { title: 'Montagem Supersonic',          category: 'Phonk',        src: U + '33335734/MONTAGEM.SUPERSONIC.mp3' },
    { title: 'Montagem Xonada',              category: 'Phonk',        src: U + '33335737/MONTAGEM.XONADA.mp3' },
    { title: 'X-Cool',                       category: 'Phonk',        src: U + '33335759/X-COOL.mp3' },
    { title: 'Montagem Fuego',               category: 'Phonk',        src: U + '33335725/MONTAGEM.FUEGO.mp3' },
    { title: 'Montagem Ladrao',              category: 'Phonk',        src: '' /* link missing */ },
    { title: 'Funk Estranho[Techno Remix]',  category: 'Phonk',        src: U + '33335684/FUNK.ESTRANHO.TECHNO.Remix.mp3' },
    { title: 'Funk Mi Camino',               category: 'Phonk',        src: U + '33335687/FUNK.MI.CAMINO.mp3' },
    { title: 'Montagem Pegadora',            category: 'Phonk',        src: U + '33335729/MONTAGEM.PEGADORA.mp3' },
    { title: 'Airtel Phonk',                 category: 'Phonk',        src: U + '33335667/AIRTEL.PHONK.mp3' },
    { title: 'Funk Sigilo',                  category: 'Phonk',        src: U + '33335688/FUNK.SIGILO.mp3' },
    { title: 'Funk Criminal',                category: 'Phonk',        src: U + '33335679/FUNK.CRIMINAL.mp3' },
    { title: 'Acido III',                    category: 'Phonk',        src: U + '33335665/ACIDO.III.mp3' },
    { title: 'Noche Eterna',                 category: 'Phonk',        src: U + '33335748/NOCHE.ETERNA.mp3' },
    { title: 'Montagem Coma',                category: 'Phonk',        src: U + '33335721/MONTAGEM.COMA.mp3' },
    { title: 'Funk Do Bounce',               category: 'Phonk',        src: U + '33335681/FUNK.DO.BOUNCE.mp3' },
    { title: 'Mortals Funk',                 category: 'Phonk',        src: U + '33335739/MORTALS.FUNK.mp3' },
    { title: 'Funk Infernal',                category: 'Phonk',        src: U + '33335685/FUNK.INFERNAL.mp3' },
    { title: 'Blah',                         category: 'Phonk',        src: U + '33335672/BLAH.mp3' },
    { title: 'Sempero',                      category: 'Phonk',        src: U + '33335751/SEMPERO.mp3' },
    { title: 'Avangard',                     category: 'Phonk',        src: U + '33335670/AVANGARD.mp3' },
    { title: 'Louca Encubada',               category: 'Phonk',        src: U + '33335710/LOUCA.ENCUBADA.mp3' },
    { title: 'Rebolaton',                    category: 'Phonk',        src: U + '33335749/REBOLATON.mp3' },
    { title: 'Ascension',                    category: 'Phonk',        src: U + '33335669/ASCENSION.mp3' },
    { title: 'Believer',                     category: 'English',      src: U + '33335671/BELIEVER.mp3' },
    { title: "He's a Pirate",                category: 'Instrumental', src: U + '33335696/HE.S.A.PIRATE.mp3' },
    { title: 'Unstoppable',                  category: 'English',      src: U + '33335757/UNSTOPPABLE.mp3' },
    { title: 'Legends Never Die',            category: 'English',      src: U + '33335708/LEGENDS.NEVER.DIE.mp3' },
    { title: 'Montagem Rugada',              category: 'Phonk',        src: U + '33335731/MONTAGEM.RUGADA.mp3' },
    { title: 'Hymn For The Weekend',         category: 'English',      src: U + '33335699/HYMN.FOR.THE.WEEKEND.mp3' },
    { title: 'Go Down Deh',                  category: 'English',      src: U + '33335690/GO.DOWN.DEH.mp3' },
    { title: 'KGF Mashup',                   category: 'Hindi',        src: U + '33335705/KGF.MASHUP.mp3' },
    { title: 'KGF - Monster',                category: 'Hindi',        src: U + '33335703/KGF.-.MONSTER.mp3' },
    { title: 'Goti Lo',                      category: 'Gujarati',     src: U + '33335694/GOTI.LO.mp3' },
    { title: 'Matushka Ultrafunk',           category: 'Phonk',        src: U + '33335713/MATUSHKA.ULTRAFUNK.mp3' },
    { title: 'Slava Funk',                   category: 'Phonk',        src: U + '33335754/SLAVA.FUNK.mp3' },
    { title: 'Slava+Village Funk', file: 'SLAVA X VILLAGE', category: 'Phonk',        src: U + '33335755/SLAVA.X.VILLAGE.mp3' },
    { title: "I'm a Peaky Blinder",          category: 'English',      src: U + '33335702/I.M.A.PEAKY.BLINDER.mp3' },
    { title: 'Skyfall',                      category: 'English',      src: U + '33335753/SKYFALL.mp3' },
    { title: 'Argentina 2026 World Cup Song', category: 'Spanish',     src: U + '33335668/ARGENTINA.2026.WORLD.CUP.SONG.mp3' },
    { title: 'Amor na Praia',                category: 'Phonk',        src: '' /* link missing */ },
    { title: 'Montagem Noche',               category: 'Phonk',        src: U + '33335727/MONTAGEM.NOCHE.mp3' },
    { title: 'Funk Abnormal',                category: 'Phonk',        src: U + '33335677/FUNK.ABNORMAL.mp3' },
    { title: 'Sem Tempo',                    category: 'Phonk',        src: U + '33335750/SEM.TEMPO.mp3' },
    { title: 'Montagem Bandido',             category: 'Phonk',        src: U + '33335720/MONTAGEM.BANDIDO.mp3' },
    { title: 'Nemras',                       category: 'Devotional',   src: U + '33335740/NEMRAS.mp3' }
  ];
})();
