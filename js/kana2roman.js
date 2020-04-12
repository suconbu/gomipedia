(function(){
    window.kana2roman = window.kana2roman || {};
    const table = {
        "あ":   "a",   "い":   "i",   "う":   "u",   "え":   "e",   "お":   "o",
        "ぁ":   "la",  "ぃ":   "li",  "ぅ":   "lu",  "ぇ":   "le",  "ぉ":   "lo",
        "か":   "ka",  "き":   "ki",  "く":   "ku",  "け":   "ke",  "こ":   "ko",
        "が":   "ga",  "ぎ":   "gi",  "ぐ":   "gu",  "げ":   "ge",  "ご":   "go",
        "きゃ": "kya", "きぃ": "kyi", "きゅ": "kyu", "きぇ": "kye", "きょ": "kyo",
        "ぎゃ": "gya", "ぎぃ": "gyi", "ぎゅ": "gyu", "ぎぇ": "gye", "ぎょ": "gyo",
        "さ":   "sa",  "し":   "shi", "す":   "su",  "せ":   "se",  "そ":   "so",
        "しゃ": "sha", "しぃ": "shi", "しゅ": "shu", "しぇ": "she", "しょ": "sho",
        "ざ":   "za",  "じ":   "ji",  "ず":   "zu",  "ぜ":   "ze",  "ぞ":   "zo",
        "じゃ": "ja",                 "じゅ": "ju",  "じぇ": "je",  "じょ": "jo", 
        "た":   "ta",  "ち":   "chi", "つ":   "tsu", "て":   "te",  "と":   "to",
        "だ":   "da",  "ぢ":   "di",  "づ":   "du",  "で":   "de",  "ど":   "do",
        "ちゃ": "cha",                "ちゅ": "chu", "ちぇ": "che", "ちょ": "cho",
        "ぢゃ": "dya", "ぢぃ": "dyi", "ぢゅ": "dyu", "ぢぇ": "dye", "ぢょ": "dyo",
        "てゃ": "tha", "てぃ": "thi", "てゅ": "thu", "てぇ": "the", "てょ": "tho",
        "でゃ": "dha", "でぃ": "dhi", "でゅ": "dhu", "でぇ": "dhe", "でょ": "dho",
        "な":   "na",  "に":   "ni",  "ぬ":   "nu",  "ね":   "ne",  "の":   "no",
        "にゃ": "nya", "にぃ": "nyi", "にゅ": "nyu", "にぇ": "nye", "にょ": "nyo",
        "は":   "ha",  "ひ":   "hi",  "ふ":   "fu",  "へ":   "he",  "ほ":   "ho",
        "ふぁ": "fa",  "ふぃ": "fi",                 "ふぇ": "fe",  "ふぉ": "fo",
        "ふゃ": "fya",                "ふゅ": "fyu",                "ふょ": "fyo",
        "ひゃ": "hya", "ひぃ": "hyi", "ひゅ": "hyu", "ひぇ": "hye", "ひょ": "hyo",
        "ば":   "ba",  "び":   "bi",  "ぶ":   "bu",  "べ":   "be",  "ぼ":   "bo",
        "びゃ": "bya", "びぃ": "byi", "びゅ": "byu", "びぇ": "bye", "びょ": "byo",
        "ぱ":   "pa",  "ぴ":   "pi",  "ぷ":   "pu",  "ぺ":   "pe",  "ぽ":   "po",
        "ぴゃ": "pya", "ぴぃ": "pyi", "ぴゅ": "pyu", "ぴぇ": "pye", "ぴょ": "pyo",
        "ま":   "ma",  "み":   "mi",  "む":   "mu",  "め":   "me",  "も":   "mo",
        "みゃ": "mya", "みぃ": "myi", "みゅ": "myu", "みぇ": "mye", "みょ": "myo",
        "や":   "ya",                 "ゆ":   "yu",                 "よ":   "yo",
        "ら":   "ra",  "り":   "ri",  "る":   "ru",  "れ":   "re",  "ろ":   "ro",
        "りゃ": "rya", "りぃ": "ryi", "りゅ": "ryu", "りぇ": "rye", "りょ": "ryo",
        "わ":   "wa",  "うぃ": "wi",                 "うぇ": "we",  "を":   "wo",
        "ん":   "n",
        "ヶ":   "ke",  "ヵ":   "ka",  "ゐ":   "i",   "ゑ":   "e",   
        "ー":   "-",   "・":   ".",   "　": " "
    };
    const sokuonRegex = /っ([bcdfghijklmnopqrstuvwyz])/gm;
    const chouonRegex = /([aiueo])-/gm;
    window.kana2roman.convert = function(input, useChouon=true) {
        let index = 0;
        let output = "";
        while (index <= input.length) {
            const k2 = input.slice(index, index + 2);
            const r2 = table[k2];
            if (r2) {
                output += r2;
                index += 2;
            } else {
                const k1 = input.slice(index, index + 1);
                const r1 = table[k1];
                output += r1 ? r1 : k1;
                index += 1;
            }
        }
        output = output.replace("っch", "tch");
        output = output.replace(sokuonRegex, "$1$1");
        if (!useChouon) {
            output = output.replace(chouonRegex, "$1$1");
        }
        output = output.replace("っ", "tsu");
        return output;
    };
})();
