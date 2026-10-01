import type { Lang } from './types';

type Extra = Partial<Omit<Lang, 'name' | 'children'>>;

/** A living language. Speakers in millions (native). */
const L = (name: string, speakers?: number, extra: Extra = {}): Lang => ({
  name,
  speakers,
  wiki: `${name} language`,
  ...extra,
});

/** An extinct language. */
const X = (name: string, extra: Extra = {}): Lang => L(name, undefined, { extinct: true, ...extra });

/** A family or branch. */
const F = (name: string, children: Lang[], extra: Extra = {}): Lang => ({
  name,
  wiki: `${name} languages`,
  children,
  ...extra,
});

const indoEuropean = F(
  'Indo-European',
  [
    F(
      'Germanic',
      [
        F('North Germanic', [
          X('Old Norse', { wiki: 'Old Norse', era: 'c. 700 – 1300 CE' }),
          L('Icelandic', 0.33),
          L('Faroese', 0.07),
          L('Norwegian', 5),
          L('Danish', 6),
          L('Swedish', 10),
        ]),
        F('West Germanic', [
          F('Anglo-Frisian', [
            X('Old English', { wiki: 'Old English', era: 'c. 450 – 1150 CE' }),
            L('English', 380, { era: 'Modern form since c. 1500 CE' }),
            L('Scots', 1.5),
            L('Frisian', 0.5, { wiki: 'Frisian languages' }),
          ]),
          F('Low Franconian', [L('Dutch', 25), L('Afrikaans', 7.2, { wiki: 'Afrikaans' })]),
          L('Low German', 2, { wiki: 'Low German' }),
          F('High German', [
            L('German', 95),
            L('Yiddish', 0.6, { wiki: 'Yiddish' }),
            L('Luxembourgish', 0.4, { wiki: 'Luxembourgish' }),
          ]),
        ]),
        F('East Germanic', [X('Gothic', { era: 'c. 300 – 800 CE' }), X('Vandalic')], { extinct: true }),
      ],
      { era: 'c. 500 BCE' },
    ),
    F(
      'Italic',
      [
        F('Latino-Faliscan', [
          X('Faliscan'),
          F(
            'Latin',
            [
              F(
                'Romance',
                [
                  F('Ibero-Romance', [
                    L('Spanish', 485),
                    L('Portuguese', 236),
                    L('Galician', 2.4),
                    L('Ladino', 0.05, { wiki: 'Judaeo-Spanish' }),
                  ]),
                  F('Occitano-Romance', [L('Catalan', 4.1), L('Occitan', 0.2)]),
                  F('Gallo-Romance', [
                    L('French', 74),
                    L('Walloon', 0.6),
                    L('Franco-Provençal', 0.15, { wiki: 'Franco-Provençal' }),
                  ]),
                  F('Italo-Dalmatian', [
                    L('Italian', 64),
                    L('Neapolitan', 5.7),
                    L('Sicilian', 4.7),
                    X('Dalmatian', { era: 'last speaker died 1898' }),
                  ]),
                  F('Rhaeto-Romance', [L('Romansh', 0.04), L('Friulian', 0.6), L('Ladin', 0.03)]),
                  L('Sardinian', 1),
                  F('Eastern Romance', [L('Romanian', 24), L('Aromanian', 0.25)]),
                ],
                { era: 'c. 500 – 900 CE' },
              ),
            ],
            { wiki: 'Latin', extinct: true, era: 'c. 700 BCE – 600 CE (spoken)' },
          ),
        ]),
        F('Osco-Umbrian', [X('Oscan'), X('Umbrian')], { extinct: true }),
      ],
      { era: 'c. 1000 BCE' },
    ),
    F(
      'Celtic',
      [
        F('Goidelic', [L('Irish', 0.17), L('Scottish Gaelic', 0.06, { wiki: 'Scottish Gaelic' }), L('Manx', 0.002)]),
        F('Brittonic', [L('Welsh', 0.9), L('Breton', 0.2), L('Cornish', 0.0006)]),
        F('Continental Celtic', [X('Gaulish'), X('Celtiberian'), X('Lepontic')], { extinct: true }),
      ],
      { era: 'c. 1200 – 800 BCE' },
    ),
    F('Balto-Slavic', [
      F(
        'Slavic',
        [
          X('Old Church Slavonic', { wiki: 'Old Church Slavonic', era: '9th – 11th c. CE' }),
          F('East Slavic', [L('Russian', 150), L('Ukrainian', 33), L('Belarusian', 5)]),
          F('West Slavic', [
            L('Polish', 40),
            L('Czech', 10.7),
            L('Slovak', 5),
            L('Sorbian', 0.03, { wiki: 'Sorbian languages' }),
          ]),
          F('South Slavic', [
            L('Serbo-Croatian', 16, { wiki: 'Serbo-Croatian' }),
            L('Slovene', 2.5),
            L('Bulgarian', 8),
            L('Macedonian', 1.6),
          ]),
        ],
        { era: 'c. 500 CE' },
      ),
      F('Baltic', [L('Lithuanian', 3), L('Latvian', 1.5), X('Old Prussian', { era: 'died out c. 1700 CE' })]),
    ]),
    F('Indo-Iranian', [
      F(
        'Indo-Aryan',
        [
          L('Sanskrit', 0.025, { wiki: 'Sanskrit', era: 'c. 1500 BCE (Vedic)', note: 'Classical & liturgical language' }),
          X('Pali', { wiki: 'Pali', era: 'c. 300 BCE', note: 'Liturgical language of Theravāda Buddhism' }),
          F('Hindustani', [L('Hindi', 345), L('Urdu', 70)], { wiki: 'Hindustani language' }),
          L('Bengali', 234),
          L('Punjabi', 113),
          L('Marathi', 83),
          L('Gujarati', 57),
          L('Odia', 35),
          L('Sindhi', 30),
          L('Nepali', 19),
          L('Sinhala', 16),
          L('Assamese', 15),
          L('Romani', 2),
        ],
        { era: 'c. 1800 BCE' },
      ),
      F('Iranian', [
        X('Avestan', { wiki: 'Avestan', era: 'c. 1500 – 500 BCE' }),
        X('Old Persian', { wiki: 'Old Persian', era: 'c. 525 – 300 BCE' }),
        X('Sogdian'),
        L('Persian', 72),
        L('Pashto', 45, { wiki: 'Pashto' }),
        L('Kurdish', 30, { wiki: 'Kurdish languages' }),
        L('Balochi', 8),
        L('Ossetian', 0.6),
      ]),
    ]),
    F(
      'Hellenic',
      [
        X('Mycenaean Greek', { wiki: 'Mycenaean Greek', era: 'c. 1600 – 1100 BCE' }),
        F(
          'Ancient Greek',
          [
            F('Koine Greek', [L('Modern Greek', 13.5, { wiki: 'Modern Greek' })], {
              wiki: 'Koine Greek',
              extinct: true,
              era: 'c. 300 BCE – 600 CE',
            }),
            L('Tsakonian', 0.002),
          ],
          { wiki: 'Ancient Greek', extinct: true, era: 'c. 800 – 300 BCE' },
        ),
      ],
    ),
    L('Armenian', 5.3, { era: 'Written since 405 CE' }),
    L('Albanian', 7.5),
    F('Anatolian', [X('Hittite', { era: 'c. 1650 – 1180 BCE' }), X('Luwian'), X('Lydian'), X('Lycian')], {
      extinct: true,
      note: 'The earliest attested Indo-European languages',
    }),
    F(
      'Tocharian',
      [X('Tocharian A', { wiki: 'Tocharian languages' }), X('Tocharian B', { wiki: 'Tocharian languages' })],
      { extinct: true, era: 'c. 400 – 1200 CE' },
    ),
  ],
  { era: 'c. 4500 – 2500 BCE', region: 'Europe, South & West Asia → worldwide' },
);

export const languageTree: Lang = {
  name: 'Human Language',
  wiki: 'Language',
  note: 'Roughly 7,000 living languages in about 140 families. Explore the major lineages.',
  children: [
    F(
      'Afroasiatic',
      [
        F(
          'Semitic',
          [
            F('East Semitic', [X('Akkadian', { era: 'c. 2600 BCE – 100 CE' }), X('Eblaite', { era: 'c. 2400 BCE' })], {
              extinct: true,
            }),
            F('Central Semitic', [
              L('Arabic', 380, { wiki: 'Arabic' }),
              L('Maltese', 0.5),
              F('Northwest Semitic', [
                L('Hebrew', 9),
                L('Aramaic', 0.9, { wiki: 'Aramaic' }),
                X('Phoenician', { era: 'c. 1050 BCE – 200 CE' }),
                X('Ugaritic', { era: 'c. 1400 – 1190 BCE' }),
              ]),
            ]),
            F('South Semitic', [L('Amharic', 35), L('Tigrinya', 9.8), X("Ge'ez", { wiki: "Ge'ez", note: 'Still used liturgically' })]),
          ],
          { era: 'c. 3750 BCE' },
        ),
        F('Egyptian', [X('Coptic', { era: 'c. 200 – 1600s CE' })], {
          wiki: 'Egyptian language',
          extinct: true,
          era: 'c. 3200 BCE',
        }),
        F('Berber', [
          L('Tashelhit', 8, { wiki: 'Shilha language' }),
          L('Kabyle', 5),
          L('Central Atlas Tamazight', 3),
          L('Tuareg', 1.2, { wiki: 'Tuareg languages' }),
        ]),
        F('Cushitic', [L('Oromo', 37), L('Somali', 22), L('Afar', 2.5)]),
        F('Chadic', [L('Hausa', 50)]),
        F('Omotic', [L('Wolaytta', 2.4)]),
      ],
      { era: 'c. 10,000 BCE (debated)', region: 'North & East Africa, Middle East' },
    ),
    indoEuropean,
    F(
      'Uralic',
      [
        F('Finnic', [L('Finnish', 5.4), L('Estonian', 1.1), L('Karelian', 0.03)]),
        L('Sámi', 0.03, { wiki: 'Sámi languages' }),
        F('Mordvinic', [L('Erzya', 0.3), L('Moksha', 0.13)]),
        L('Mari', 0.4),
        F('Permic', [L('Komi', 0.16), L('Udmurt', 0.32)]),
        F('Ugric', [L('Hungarian', 13), L('Khanty', 0.01), L('Mansi', 0.001)]),
        F('Samoyedic', [L('Nenets', 0.02, { wiki: 'Nenets languages' }), L('Selkup', 0.001)]),
      ],
      { era: 'c. 4000 – 2000 BCE (debated)', region: 'Northern Eurasia' },
    ),
    F('Kartvelian', [L('Georgian', 3.7), L('Mingrelian', 0.5), L('Svan', 0.03), L('Laz', 0.02)], {
      region: 'South Caucasus',
    }),
    F(
      'Northwest Caucasian',
      [L('Kabardian', 1.6), L('Adyghe', 0.6), L('Abkhaz', 0.19), X('Ubykh', { era: 'last speaker died 1992' })],
      { region: 'North Caucasus' },
    ),
    F('Northeast Caucasian', [L('Chechen', 1.8), L('Avar', 0.8), L('Lezgian', 0.6), L('Dargwa', 0.5), L('Ingush', 0.5)], {
      region: 'North Caucasus',
    }),
    F(
      'Turkic',
      [
        X('Old Turkic', { wiki: 'Old Turkic', era: '8th – 13th c. CE' }),
        F('Oghuz', [L('Turkish', 75), L('Azerbaijani', 24), L('Turkmen', 7), L('Gagauz', 0.15)]),
        F('Kipchak', [L('Kazakh', 13), L('Tatar', 5), L('Kyrgyz', 4.5), L('Bashkir', 1.2)]),
        F('Karluk', [L('Uzbek', 34), L('Uyghur', 10)]),
        F('Siberian Turkic', [L('Yakut', 0.45), L('Tuvan', 0.28)]),
        F('Oghur', [L('Chuvash', 0.7), X('Bulgar')]),
      ],
      { era: 'c. 500 BCE', region: 'Central Asia, Anatolia, Siberia' },
    ),
    F(
      'Mongolic',
      [
        X('Middle Mongol', { wiki: 'Middle Mongol', era: '13th – 16th c. CE' }),
        L('Mongolian', 5.2),
        L('Buryat', 0.27),
        L('Kalmyk', 0.08, { wiki: 'Kalmyk Oirat' }),
      ],
      { region: 'Mongolia, Inner Asia' },
    ),
    F('Tungusic', [L('Evenki', 0.03), L('Manchu', 0.0001), X('Jurchen', { era: '12th – 16th c. CE' })], {
      region: 'Siberia, Manchuria',
    }),
    F('Koreanic', [L('Korean', 80), L('Jeju', 0.005)], { region: 'Korean Peninsula' }),
    F(
      'Japonic',
      [
        X('Old Japanese', { wiki: 'Old Japanese', era: '8th c. CE' }),
        L('Japanese', 125),
        L('Ryukyuan', 1, { wiki: 'Ryukyuan languages' }),
      ],
      { era: 'c. 1000 BCE (arrival in Japan)', region: 'Japan' },
    ),
    F(
      'Sino-Tibetan',
      [
        F(
          'Sinitic',
          [
            F(
              'Old Chinese',
              [
                L('Min', 75, { wiki: 'Min Chinese' }),
                F(
                  'Middle Chinese',
                  [
                    L('Mandarin', 940, { wiki: 'Mandarin Chinese' }),
                    L('Yue (Cantonese)', 86, { wiki: 'Yue Chinese' }),
                    L('Wu', 82, { wiki: 'Wu Chinese' }),
                    L('Hakka', 48, { wiki: 'Hakka Chinese' }),
                    L('Jin', 48, { wiki: 'Jin Chinese' }),
                    L('Xiang', 38, { wiki: 'Xiang Chinese' }),
                    L('Gan', 22, { wiki: 'Gan Chinese' }),
                  ],
                  { wiki: 'Middle Chinese', extinct: true, era: 'c. 600 – 1000 CE' },
                ),
              ],
              { wiki: 'Old Chinese', extinct: true, era: 'c. 1250 BCE (oracle bones)' },
            ),
          ],
          { wiki: 'Varieties of Chinese' },
        ),
        F('Tibeto-Burman', [
          F('Lolo-Burmese', [L('Burmese', 33), L('Yi', 9, { wiki: 'Loloish languages' })]),
          F('Tibetic', [L('Tibetan', 1.2, { wiki: 'Lhasa Tibetan' }), L('Dzongkha', 0.17)]),
          L('Karen', 4, { wiki: 'Karenic languages' }),
          L('Meitei', 1.8),
          L('Newar', 0.86),
          X('Tangut', { era: '11th – 16th c. CE' }),
        ]),
      ],
      { era: 'c. 5000 – 4000 BCE', region: 'East & Southeast Asia, Himalayas' },
    ),
    F('Hmong–Mien', [L('Hmong', 4), L('Iu Mien', 0.8)], { region: 'Southern China, Southeast Asia' }),
    F(
      'Kra–Dai',
      [F('Tai', [L('Thai', 21), L('Zhuang', 16, { wiki: 'Zhuang languages' }), L('Lao', 7.5), L('Shan', 3.3)]), L('Hlai', 0.67)],
      { region: 'Southeast Asia, Southern China' },
    ),
    F(
      'Austroasiatic',
      [
        F('Vietic', [L('Vietnamese', 85), L('Muong', 1.4)]),
        L('Khmer', 17),
        L('Mon', 0.85),
        F('Munda', [L('Santali', 7.6), L('Ho', 1.4), L('Mundari', 1.2)]),
        L('Khasi', 1.4),
      ],
      { region: 'Southeast & South Asia' },
    ),
    F(
      'Dravidian',
      [
        F('South Dravidian', [L('Tamil', 79), L('Kannada', 44), L('Malayalam', 37), L('Tulu', 1.8)]),
        F('South-Central Dravidian', [L('Telugu', 83), L('Gondi', 3)]),
        F('North Dravidian', [L('Brahui', 2.4), L('Kurukh', 2)]),
      ],
      { era: 'c. 2500 BCE', region: 'South Asia' },
    ),
    F(
      'Austronesian',
      [
        F('Formosan', [L('Amis', 0.18), L('Atayal', 0.08)], { note: 'Taiwan — the Austronesian homeland' }),
        F('Malayo-Polynesian', [
          F('Philippine', [L('Tagalog', 28), L('Cebuano', 21), L('Ilocano', 8)]),
          F('Malayic', [L('Indonesian', 43), L('Malay', 33)]),
          L('Javanese', 68),
          L('Sundanese', 32),
          L('Malagasy', 25),
          L('Chamorro', 0.06),
          F('Oceanic', [
            L('Fijian', 0.45),
            F('Polynesian', [
              L('Samoan', 0.5),
              L('Tongan', 0.19),
              L('Tahitian', 0.07),
              L('Māori', 0.05),
              L('Hawaiian', 0.02),
            ]),
          ]),
        ]),
      ],
      { era: 'c. 3500 BCE (Taiwan)', region: 'Madagascar to Easter Island' },
    ),
    F(
      'Trans–New Guinea',
      [L('Enga', 0.23), L('Melpa', 0.13), L('Dani', 0.1, { wiki: 'Grand Valley Dani language' })],
      { region: 'New Guinea' },
    ),
    F(
      'Pama–Nyungan',
      [
        L('Western Desert', 0.0075),
        L('Warlpiri', 0.003),
        L('Arrernte', 0.0045),
        L('Yolŋu', 0.01, { wiki: 'Yolŋu languages' }),
        L('Guugu Yimithirr', 0.0008),
      ],
      { region: 'Australia', note: 'Covers about 90% of the Australian continent' },
    ),
    F(
      'Eskimo–Aleut',
      [
        F('Inuit', [L('Greenlandic', 0.057), L('Inuktitut', 0.04, { wiki: 'Inuktitut' }), L('Inupiaq', 0.002)]),
        L('Yupik', 0.01, { wiki: 'Yupik languages' }),
        L('Aleut', 0.0001),
      ],
      { region: 'Arctic North America, Greenland, Siberia' },
    ),
    F(
      'Na-Dene',
      [
        F('Athabaskan', [
          L('Navajo', 0.17),
          L('Apache', 0.015, { wiki: 'Apachean languages' }),
          L('Chipewyan', 0.01),
        ]),
        L('Tlingit', 0.0002),
        X('Eyak', { era: 'last speaker died 2008' }),
      ],
      { region: 'Western North America' },
    ),
    F(
      'Algic',
      [F('Algonquian', [L('Cree', 0.1), L('Ojibwe', 0.05), L("Mi'kmaq", 0.008), L('Blackfoot', 0.003)])],
      { region: 'Eastern & Central North America' },
    ),
    F('Iroquoian', [L('Cherokee', 0.002), L('Mohawk', 0.004), L('Seneca', 0.0001), X('Wyandot')], {
      region: 'Eastern North America',
    }),
    F('Siouan', [L('Lakota', 0.002), L('Dakota', 0.001), L('Crow', 0.003), L('Ho-Chunk', 0.0002)], {
      region: 'Great Plains',
    }),
    F(
      'Uto-Aztecan',
      [
        F('Nahuan', [L('Nahuatl', 1.7, { wiki: 'Nahuatl' }), X('Classical Nahuatl', { wiki: 'Classical Nahuatl' })]),
        L("O'odham", 0.015),
        L('Hopi', 0.007),
        L('Shoshoni', 0.001),
        L('Comanche', 0.0001),
      ],
      { era: 'c. 3000 BCE', region: 'Western USA & Mexico' },
    ),
    F(
      'Mayan',
      [
        X('Classic Maya', { era: 'c. 200 – 900 CE', note: 'Language of the Maya hieroglyphs' }),
        L("K'iche'", 1.1),
        L('Yucatec Maya', 0.8),
        L("Q'eqchi'", 0.8),
        L('Mam', 0.6),
        L('Tzeltal', 0.6),
      ],
      { era: 'c. 2200 BCE', region: 'Mesoamerica' },
    ),
    F('Arawakan', [L('Wayuu', 0.4), L('Asháninka', 0.07), X('Taíno')], { region: 'Caribbean & South America' }),
    F(
      'Tupian',
      [
        F('Tupi–Guarani', [L('Guarani', 6.5), L('Nheengatu', 0.02), X('Old Tupi', { wiki: 'Tupi language' })]),
        L('Mundurukú', 0.01),
      ],
      { region: 'Amazonia, Paraguay' },
    ),
    F('Quechuan', [L('Southern Quechua', 6, { wiki: 'Southern Quechua' }), L('Kichwa', 0.5)], {
      region: 'Andes',
      note: 'Language of the Inca Empire',
    }),
    F('Aymaran', [L('Aymara', 1.7), L('Jaqaru', 0.0007)], { region: 'Andes' }),
    F('Khoe–Kwadi', [L('Khoekhoe', 0.2), L('Naro', 0.014)], {
      region: 'Southern Africa',
      note: 'Famous for click consonants',
    }),
    F('Tuu', [L('Taa', 0.0026)], { region: 'Kalahari' }),
    F(
      'Niger–Congo',
      [
        F('Mande', [L('Bambara', 14), L('Soninke', 2), L('Mandinka', 2)]),
        F('Atlantic–Congo', [
          F('Atlantic', [L('Fula', 37), L('Wolof', 5.5)], { wiki: 'Atlantic languages' }),
          F('Gur', [L('Mooré', 8)]),
          F('Kwa', [L('Akan', 11)]),
          F('Volta–Niger', [L('Yoruba', 45), L('Igbo', 31), L('Ewe', 7)]),
          F('Benue–Congo', [
            F(
              'Bantu',
              [
                L('Swahili', 16),
                L('Zulu', 14),
                L('Kinyarwanda', 12),
                L('Chichewa', 12, { wiki: 'Chewa language' }),
                L('Shona', 11),
                L('Lingala', 10),
                L('Xhosa', 8.2),
                L('Kikongo', 7, { wiki: 'Kongo language' }),
                L('Sesotho', 5.6, { wiki: 'Sotho language' }),
                L('Luganda', 5.6, { wiki: 'Luganda' }),
              ],
              { era: 'Expansion from c. 3000 BCE' },
            ),
          ]),
        ]),
      ],
      { wiki: 'Niger–Congo languages', era: 'c. 10,000 BCE (debated)', region: 'Sub-Saharan Africa' },
    ),
    F(
      'Nilo-Saharan',
      [
        F('Nilotic', [L('Luo', 4.2, { wiki: 'Dholuo' }), L('Dinka', 2), L('Maasai', 1.5), L('Nuer', 0.8)]),
        F('Saharan', [L('Kanuri', 9)]),
        L('Songhay', 3.2, { wiki: 'Songhay languages' }),
        F('Nubian', [L('Nobiin', 0.7), X('Old Nubian', { era: 'c. 800 – 1500 CE' })]),
      ],
      { region: 'Central & East Africa', note: 'A proposed family; its unity is still debated' },
    ),
    F(
      'Language isolates',
      [
        L('Basque', 0.75, { note: 'The last surviving pre-Indo-European language of Western Europe' }),
        L('Burushaski', 0.1),
        L('Zuni', 0.0095),
        L('Nivkh', 0.0002),
        L('Ainu', 0.00001, { note: 'Critically endangered' }),
        X('Sumerian', { era: 'c. 3100 – 2000 BCE', note: 'One of the first written languages' }),
        X('Elamite', { era: 'c. 2600 – 330 BCE' }),
        X('Etruscan', { era: 'c. 700 BCE – 50 CE' }),
      ],
      { wiki: 'Language isolate', note: 'Languages with no demonstrable living relatives' },
    ),
    F(
      'Creoles & Pidgins',
      [
        L('Haitian Creole', 13, { wiki: 'Haitian Creole' }),
        L('Nigerian Pidgin', 5, { wiki: 'Nigerian Pidgin' }),
        L('Jamaican Patois', 3, { wiki: 'Jamaican Patois' }),
        L('Papiamento', 0.34, { wiki: 'Papiamento' }),
        L('Tok Pisin', 0.12, { wiki: 'Tok Pisin' }),
        L('Bislama', 0.01, { wiki: 'Bislama' }),
      ],
      { wiki: 'Creole language', note: 'New languages born from contact between peoples' },
    ),
  ],
};
