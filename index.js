/**
 * @author   Ricardo Ezequiel López
 * @contact  mail@lopezezequiel.com
 * @license  GPLv3
 * 
 * 
 * Stemmer_es is an implementation in javascript of the Porter algorithm
 * for the Spanish language. It is based on this article:
 * http://snowball.tartarus.org/algorithms/spanish/stemmer.html
 *
 * Stemmer_es es una implementación en javascript del algoritmo de 
 * Porter para el idioma Español. Está basado en este artículo:
 * http://snowball.tartarus.org/algorithms/spanish/stemmer.html
 */

var stemmer_es = new function() {

    //RegExps
    //------------------------------------------------------------------

    var r1r2_re = /^.*?[aeiouáéíóúü][^aeiouáéíóúü](.*)/;

    var rv_re = /^(.[^aeiouáéíóúü]+[aeiouáéíóúü]|[aeiouáéíóúü]{2,}[^aeiouáéíóúü]|[^aeiouáéíóúü][aeiouáéíóúü].)(.*)/;

    var step0_re = /((i[eé]ndo|[aá]ndo|[aáeéií]r|u?yendo)(sel[ao]s?|l[aeo]s?|nos|se|me))$/;

    var replace_accents = [
        [/á/g, 'a'],
        [/é/g, 'e'],
        [/í/g, 'i'],
        [/ó/g, 'o'],
        [/ú/g, 'u'],
    ];

    var step1_re = [
        [/(anzas?|ic[oa]s?|ismos?|[ai]bles?|istas?|os[oa]s?|[ai]mientos?)$/, '', 'r2'],
        [/((ic)?(adora?|ación|ador[ae]s|aciones|antes?|ancias?))$/, '', 'r2'],
        [/(logías?)$/, 'log', 'r2'],
        [/(ución|uciones)$/, 'u', 'r2'],
        [/(encias?)$/, 'ente', 'r2'],
        [/((os|ic|ad|(at)?iv)amente)$/, '', 'r2'],
        [/(amente)$/, '', 'r1'],
        [/((ante|[ai]ble)?mente)$/, '', 'r2'],
        [/((abil|ic|iv)?idad(es)?)$/, '', 'r2'],
        [/((at)?iv[ao]s?)$/, '', 'r2'],
    ];

    var step2a_re = /(y[ae]n?|yeron|yendo|y[oó]|y[ae]s|yais|yamos)$/;

    var step2b_re_1 = /(en|es|éis|emos)$/;

    var step2b_re_2 = [
        /(([aei]ría|ié(ra|se))mos)$/, //7 chars
        /(([aei]re|á[br]a|áse)mos)$/, //6 chars
        /([aei]ría[ns]|[aei]réis|ie((ra|se)[ns]|ron|ndo)|a[br]ais|aseis|íamos)$/, //5 chars
        /([aei](rá[ns]|ría)|a[bdr]as|id[ao]s|íais|([ai]m|ad)os|ie(se|ra)|[ai]ste|aban|ar[ao]n|ase[ns]|ando)$/, //4 chars
        /([aei]r[áé]|a[bdr]a|[ai]d[ao]|ía[ns]|áis|ase)$/, //3 chars
        /(í[as]|[aei]d|a[ns]|ió|[aei]r)$/, //2 chars
    ];

    var step3_re_1 = /(os|a|o|á|í|ó)$/;

    var step3_re_2 = /(u?é|u?e)$/;


    //Utils
    //------------------------------------------------------------------

    var removeAccents = function(word) {
        replace_accents.forEach(function(r) {
            word = word.replace(r[0], r[1]);
        });

        return word;
    };

    var getRegions = function(word) {
        //R1 is the region after the first non-vowel following a vowel,
        //or is the null region at the end of the word if there is no
        //such non-vowel.
        var r1 = r1r2_re.exec(word);
        r1 = r1 ? r1[1] : '';

        //R2 is the region after the first non-vowel following a vowel
        //in R1, or is the null region at the end of the word if there
        //is no such non-vowel.
        var r2 = r1r2_re.exec(r1);
        r2 = r2 ? r2[1] : '';

        //If the second letter is a consonant, RV is the region after
        //the next following vowel, or if the first two letters are
        //vowels, RV is the region after the next consonant, and
        //otherwise (consonant-vowel case) RV is the region after the
        //third letter. But RV is the end of the word if these positions
        //cannot be found.
        var rv = rv_re.exec(word);
        rv = rv ? rv[2] : '';

        return {r1: r1, r2: r2, rv: rv, word: word, };
    }


    //Steps
    //------------------------------------------------------------------

    //Attached pronoun
    var step0 = function(r) {

        //Search for the longest among the following suffixes 
        //me, se, sela, selo, selas, selos, la, le, lo, las, les, los, nos
        //and delete it, if comes after one of:
        //iéndo, ándo, ár, ér, ír, ando, iendo, ar, er, ir, yendo(following u)
        var g = step0_re.exec(r.rv);

        if(g) {
            var w = r.word.substr(0, r.word.length-g[1].length);

            //In the case of (yendo following u), yendo must lie in RV,
            //but the preceding u can be outside it.
            if(g[2] == 'yendo' && w.substr(-1) != 'u') {
                return r.word;
            }

            //In the case of (iéndo   ándo   ár   ér   ír), deletion is
            //followed by removing the acute accent (for example,
            //haciéndola -> haciendo).
            return w + removeAccents(g[2]);
        }

        return r.word;
    }

    //Standard suffix removal
    var step1 = function(r) {
        var rule, match;

        for(var i=0; i<step1_re.length; i++) {
            rule = step1_re[i];
            match = rule[0].exec(r[rule[2]]);
            if(match) {
                var w = r.word.substr(0, r.word.length-match[1].length);
                return w + rule[1];
            }
        }

        //Do step 2a if no ending was removed by step 1. 
        return step2a(r);
    }

    //Verb suffixes beginning y
    var step2a = function(r) {
        //Search for the longest among the following suffixes in RV,
        //and if found, delete if preceded by u.
        //ya, ye, yan, yen, yeron, yendo, yo, yó, yas, yes, yais, yamos
        var match = step2a_re.exec(r.rv);

        if(match){
            var w = r.word.substr(0, r.word.length-match[1].length);

            //Note that the preceding u need not be in RV
            if(w.substr(-1) == 'u') {
                return w;
            }
        }

        //Do Step 2b if step 2a was done, but failed to remove a suffix.
        return step2b(r);
    }

    //Other verb suffixes
    var step2b = function(r) {
        //Search for the longest among the following suffixes in RV,
        //and perform the action indicated.

        //iera, ad, ed, id, ase, iese, aste, iste, an, aban, ían, aran,
        //ieran, asen, iesen, aron, ieron, ado, ido, ando, iendo, ió, ar,
        //er, ir, as, idas, ías, aras, ieras, ases, ieses,
        //áis, abais, íais, arais, ierais,   aseis, ieseis, asteis,
        //isteis, ados, idos, amos, ábamos, íamos, imos, áramos, iéramos,
        //iésemos, ásemos
        //delete
        for(var i=0; i<step2b_re_2.length; i++) {
            var match = step2b_re_2[i].exec(r.rv);
            if(match) {
                return r.word.replace(step2b_re_2[i], '');
            }
        }

        //en, es, éis, emos
        //delete, and if preceded by gu delete the u (the gu need not be
        // in RV)
        var match = step2b_re_1.exec(r.rv);
        if(match) {
            var w = r.word.substr(0, r.word.length-match[1].length);
            if(w.substr(-2)=='gu') {
                return w.substr(0, w.length-1);
            }
            return w;
        }

        return r.word;
    }

    //residual suffix
    var step3 = function(r) {
        //Search for the longest among the following suffixes in RV, and
        //perform the action indicated.

        //os, a, o, á, í, ó
        //delete if in RV 
        var match = step3_re_1.exec(r.rv);
        if(match) {
            return r.word.replace(step3_re_1, '');
        }

        //e, é
        //delete if in RV, and if preceded by gu with the u in RV delete
        //the u
        match = step3_re_2.exec(r.rv);
        if(match) {
            if(match[1].substr(0,1)=='u' && r.word.substr(-3, 2)=='gu') {
                return r.word.substr(0, r.word.length-2);
            }
            return r.word.substr(0, r.word.length-1);
        }

        return r.word;
    }

    //stem function
    this.stem = function(word) {
        word = word.toLowerCase().trim();
        var r = getRegions(word);
        word = step0(r);
        r = getRegions(word);
        word = step1(r);
        r = getRegions(word);
        word = step3(r);
        return removeAccents(word);
    }

}();


module.exports = stemmer_es;