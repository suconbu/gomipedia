(function() {

Vue.component("list-item", {
    props: ["data", "text", "image", "exclamation", "click", "highlighter"],
    template: `
        <li @click="click(data)">
            <img class="normal-icon" v-if="image" :src="image">
            <span v-html="highlighter ? highlighter(text) : text" />
            <img class="small-icon" v-if="exclamation" src="img/note.png">
        </li>
    `
});

Vue.component("legend-list-item", {
    props: ["text", "image"],
    template: `
        <li class="legend-list-item">
            <img class="legend-icon" :src="image">{{text}}
        </li>
    `
});

// 凡例にはこの順番で表示します
const commonCategories = [
    { "id": "burnable", "name": "可燃ごみ", "image": "img/burnable.png" },
    { "id": "unburnable", "name": "不燃ごみ", "image": "img/unburnable.png" },
    { "id": "hazardous", "name": "危険ごみ", "image": "img/hazardous.png" },
    { "id": "oversized", "name": "粗大ごみ", "image": "img/oversized.png" },
    { "id": "recyclable", "name": "資源", "image": "img/recyclable.png" },
    { "id": "legalrecycling", "name": "家電リサイクル法対象", "image": "img/legalrecycling.png" },
    { "id": "pointcollection", "name": "拠点回収", "image": "img/pointcollection.png" },
    { "id": "localcollection", "name": "集団回収", "image": "img/localcollection.png" },
    { "id": "uncollectible", "name": "回収できません", "image": "img/uncollectible.png" },
    { "id": "unknown", "name": "その他", "image": "img/unknown.png" }
];
const commonCategoryMap = {};
commonCategories.forEach(category => commonCategoryMap[category.id] = { "name": category.name, "image": category.image });

let app = null;
const data = {};

data.currentMunicipalityId = "aichi_nagoya_shi";

//TODO: 外部ファイル化
data.allMunicipalities = {
    "aichi_toyokawa_shi": { name: "豊川市", file: "gomidata_aichi_toyokawa_shi.json" },
    "aichi_nagoya_shi": { name: "名古屋市", file: "gomidata_aichi_nagoya_shi.json" }
};

function getIndex(articles, article, offset, wraparound) {
    let index = articles.findIndex(a => a === article);
    if (0 < index) {
        index += offset;
        if (wraparound) {
            index =
                (index < 0) ? (articles.length + index) :
                (articles.length <= index) ? (index - articles.length) :
                index;
        } else {
            index =
                (index < 0) ? 0 :
                (articles.length <= index) ? (articles.length - 1) :
                index;
        }
    }
    return index;
}

function getMatchedArticles(articles, keyword) {
    let matched = [];
    if (keyword) {
        keyword = keyword.toLowerCase()
        matched = matched.concat(articles.filter(article => 
            article.name.toLowerCase() === keyword ||
            (article.nameKana && article.nameKana === keyword) ||
            (article.nameRoman && article.nameRoman === keyword)
            ));
        matched = matched.concat(articles.filter(article => 
            matched.indexOf(article) === -1 && (
                article.name.toLowerCase().startsWith(keyword) ||
                (article.nameKana && article.nameKana.startsWith(keyword)) ||
                (article.nameRoman && article.nameRoman.startsWith(keyword))
            )));
        matched = matched.concat(articles.filter(article => 
            matched.indexOf(article) === -1 && (
                article.name.toLowerCase().indexOf(keyword) !== -1 ||
                (article.nameKana && article.nameKana.indexOf(keyword) !== -1) ||
                (article.nameRoman && article.nameRoman.indexOf(keyword) !== -1)
            )));
    } else {
        matched = articles;
    }
    return matched;
}

function request(filename) {
    const request = new XMLHttpRequest();
    request.open('GET', `data/${filename}`);
    request.responseType = 'json';
    request.send();
    request.onload = function() {
        loadGomiData(request.response);
        if (app == null) {
            app = createApp();
        }
    }
}

function loadGomiData(gomidata) {
    data.updatedAt = gomidata.updatedAt;
    data.sourceUrl = gomidata.sourceUrl;
    data.allArticles = gomidata.articles;
    data.allArticles.forEach((article, index) => article.no = index);
    data.categoryMap = {};
    for (let article of data.allArticles) {
        if (!(article.categoryId in data.categoryMap)) {
            data.categoryMap[article.categoryId] = Object.assign({}, commonCategoryMap[article.categoryId]);
        }
    }
    if (gomidata.localCategoryDefinition) {
        for (let categoryId of Object.keys(gomidata.localCategoryDefinition)) {
            if (!(categoryId in commonCategoryMap)) {
                console.error(`Invalid categoryId: ${categoryId} in localCategoryDefinition`);
                continue;
            }
            entry = gomidata.localCategoryDefinition[categoryId];
            if (!(categoryId in data.categoryMap)) {
                // 凡例表示で使うので設定
                data.categoryMap[categoryId] = Object.assign({}, commonCategoryMap[categoryId]);
            }
            parentCategory = data.categoryMap[categoryId];
            if (entry.name) {
                // 表示名上書き
                parentCategory.name = entry.name;
            }
            if (entry.subCategories) {
                for (let subCategoryId of Object.keys(entry.subCategories)) {
                    subCategory = entry.subCategories[subCategoryId];
                    data.categoryMap[subCategoryId] = {
                        name: `${subCategory.name} (${parentCategory.name})`,
                        image: parentCategory.image
                    }
                }
            }
        }
    }
    data.legendCategoryIds = [];
    for (let commonCategory of commonCategories) {
        if (commonCategory.id in data.categoryMap) {
            data.legendCategoryIds.push(commonCategory.id);
        }
    }

    const index = Math.floor(Math.random() * data.allArticles.length);
    data.placeholder = "例：" + data.allArticles[index].name;

    data.keyword = "";
    data.selectedArticle = null;
    data.waitingArticles = [];
    data.appearedArticles = [];
    data.timeoutId = 0;
    data.municipalityPopupVisible = false;
}

function createApp(response) {
    return new Vue({
        el: "#app",
        data: data,
        watch: {
            keyword: function(newValue, oldValue) {
                this.keyword = newValue;
                // https://s8a.jp/javascript-escape-regexp
                escaped = this.keyword.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
                this.keywordRegex = new RegExp(escaped, "ig");
                this.updateAppearedArticles(getMatchedArticles(this.allArticles, this.keyword));
            },
            allArticles: function(newValue, oldValue) {
                this.updateAppearedArticles(this.allArticles)
            }
        },
        created() {
            this.updateAppearedArticles(this.allArticles);
        },
        methods: {
            updateAppearedArticles(articles) {
                this.waitingArticles = articles;
                this.appearedArticles = [];
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                }
                this.transferAppearedArticles(0, 50);
            },
            transferAppearedArticles(start, count) {
                if (start < this.waitingArticles.length) {
                    const articles = this.waitingArticles.slice(start, start + count);
                    this.appearedArticles = this.appearedArticles.concat(articles);
                    this.timeoutId = setTimeout(() => this.transferAppearedArticles(start + articles.length, count), 10)
                } else {
                    this.timeoutId = 0;
                    this.waitingArticles = [];
                }
            },
            articleClicked(article) {
                this.selectedArticle = article;
                this.$nextTick(function() {
                    this.$refs.popupWindow.focus();
                })
            },
            popupKeydown(e) {
                if (e.key == "ArrowUp" || e.key == "ArrowLeft") {
                    this.moveArticleSelection(-1, true);
                } else if (e.key == "ArrowDown" || e.key == "ArrowRight") {
                    this.moveArticleSelection(+1, true);
                } else if (e.key == "PageUp") {
                    this.moveArticleSelection(-10, false);
                } else if (e.key == "PageDown") {
                    this.moveArticleSelection(+10, false);
                } else if (e.key == "Home") {
                    this.moveArticleSelection(-this.allArticles.length, false);
                } else if (e.key == "End") {
                    this.moveArticleSelection(+this.allArticles.length, false);
                } else if (e.key == "Enter" || e.key == "Escape") {
                    this.closePopup();
                }
            },
            moveArticleSelection(offset, wraparound) {
                const nextIndex = getIndex(this.appearedArticles, this.selectedArticle, offset, wraparound);
                if (nextIndex !== -1) {
                    this.selectedArticle = this.appearedArticles[nextIndex];
                    this.$refs.article[nextIndex].$el.scrollIntoView(false);
                }
            },
            closePopup() {
                this.selectedArticle = null;
            },
            dummy(e) {
                e.stopPropagation();
            },
            getKeywordHighlighted(text) {
                return this.keyword ? text.replace(this.keywordRegex, match => "<span class='keyword-highlight'>" + match + "</span>") : text;
            },
            openMunicipalityPopup() {
                this.municipalityPopupVisible = true;
            },
            closeMunicipalityPopup() {
                this.municipalityPopupVisible = false;
            },
            municipalityClicked(municipalityId) {
                this.municipalityPopupVisible = false;
                this.currentMunicipalityId = municipalityId;
                request(data.allMunicipalities[data.currentMunicipalityId].file)
            }
        }
    });
}

request(data.allMunicipalities[data.currentMunicipalityId].file);

})();
