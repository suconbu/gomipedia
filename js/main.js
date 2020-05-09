(function() {

Vue.component("list-item", {
    props: ["data", "text", "icon", "exclamation", "click", "highlighter"],
    template: `
        <li @click="click(data)">
            <img class="normal-icon" v-if="icon" :src="icon">
            <span v-html="highlighter ? highlighter(text) : text" />
            <img class="small-icon" v-if="exclamation" src="img/note.png">
        </li>
    `
});

Vue.component("legend-list-item", {
    props: ["text", "icon"],
    template: `
        <li class="legend-list-item">
            <img class="legend-icon" :src="icon">{{text}}
        </li>
    `
});

// 品目リスト更新時の一回分の増加数(0なら一回で全部表示)
const ARTICLE_TRANSFER_UNIT = 50;

// 自治体
const SUPPORTED_MUNICS = [
    { id: "aichi_toyokawa", name: "豊川市", file: "data/gomidata_aichi_toyokawa.json" },
    { id: "aichi_nagoya", name: "名古屋市", file: "data/gomidata_aichi_nagoya.json" },
    { id: "aichi_okazaki", name: "岡崎市", file: "data/gomidata_aichi_okazaki.json" },
    { id: "aichi_toyota", name: "豊田市", file: "data/gomidata_aichi_toyota.json" },
    { id: "aichi_ichinomiya", name: "一宮市", file: "data/gomidata_aichi_ichinomiya.json" },
    { id: "aichi_toyohashi", name: "豊橋市", file: "data/gomidata_aichi_toyohashi.json" }
];

// 共通分類
// 凡例にはこの順番で表示します
const COMMON_CATEGORIES = [
    { id: "burnable", name: "可燃ごみ" },
    { id: "unburnable", name: "不燃ごみ" },
    { id: "hazardous", name: "危険ごみ" },
    { id: "oversized", name: "粗大ごみ" },
    { id: "recyclable", name: "資源" },
    { id: "can", name: "資源" },
    { id: "metal", name: "金属" },
    { id: "petbottle", name: "ペットボトル" },
    { id: "grassbottle", name: "空きびん" },
    { id: "reusebottle", name: "再利用びん" },
    { id: "beveragepack", name: "紙パック" },
    { id: "paperpackaging", name: "紙製容器包装" },
    { id: "plasticpackaging", name: "プラ製容器包装" },
    { id: "legalrecycling", name: "家電リサイクル法対象" },
    { id: "pointcollection", name: "拠点回収" },
    { id: "localcollection", name: "集団回収" },
    { id: "uncollectible", name: "回収できません" },
    { id: "unknown", name: "その他" }
];

function getQueryVars() {
    const vars = {}
    uri = decodeURI(window.location.search);
    for (let entry of uri.slice(1).split("&")) {
        keyValue = entry.split("=");
        vars[keyValue[0]] = keyValue[1]
    }
    return vars;
}

function getIndex(articles, article, offset, wraparound) {
    let index = articles.findIndex(a => a === article);
    if (0 <= index) {
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
    request.open('GET', filename);
    request.responseType = 'json';
    request.send();
    request.onload = function() {
        appState.load(request.response);
        app = app || createApp(appState);
        if (appState.initialArticleKeyword) {
            app.$data.articleKeyword = appState.initialArticleKeyword;
            appState.initialArticleKeyword = null;
        }
    }
}

class AppState {
    constructor() {
        this.allMunicsById = {}
        SUPPORTED_MUNICS.forEach(munic => this.allMunicsById[munic.id] = munic);
        this.commonCategoriesById = {};
        for (let commonCategory of COMMON_CATEGORIES) {
            this.commonCategoriesById[commonCategory.id] = Object.assign({}, commonCategory);
        }
        this.selectedMunic = null;
        this.municPopupVisible = false;
        this.initialArticleKeyword = null;
        this.reset();
    }
    reset() {
        this.timeoutId = 0;
        this.articleKeyword = "";
        this.municKeyword = "";
        this.placeholder = "";
        this.categoriesById = {};
        this.allArticles = [];
        this.waitingArticles = [];
        this.visibleArticles = [];
        this.selectedArticle = null;
        // this.legendCategoryIds = [];
        this.dataSourceUrl = null;
        this.updatedAt = null;
    }
    load(gomidata) {
        this.reset();
        this.dataSourceUrl = gomidata.datasourceUrl;
        this.updatedAt = gomidata.updatedAt;
        this.allArticles = gomidata.articles;
        this.allArticles.forEach((article, index) => {
            article.no = index;
            article.nameRoman = kana2roman.convert(article.nameKana, true);
        });

        this.categoriesById = {};
        for (let categoryId of Object.keys(gomidata.categoryDefinitions)) {
            const periodIndex = categoryId.indexOf(".");
            const commonCategoryId = (0 <= periodIndex) ? categoryId.slice(0, periodIndex) : categoryId;
            const entry = Object.assign({},
                this.commonCategoriesById[commonCategoryId] ||
                this.commonCategoriesById.unknown);
            entry.id = categoryId;
            const def = gomidata.categoryDefinitions[categoryId];
            // 独自定義値あればそれで上書き
            entry.name = def.name || entry.name;
            entry.icon = def.icon || entry.icon;
            if (!entry.icon) {
                entry.icon = `img/${commonCategoryId}.png`;
            }
            entry.isParent = (categoryId == commonCategoryId);
            this.categoriesById[categoryId] = entry;
        }

        const index = Math.floor(Math.random() * this.allArticles.length);
        this.placeholder = "例：" + this.allArticles[index].name;
    }
}

function createApp(data) {
    return new Vue({
        el: "#app",
        data: data,
        watch: {
            articleKeyword: function(newValue, oldValue) {
                this.articleKeyword = newValue;
                // https://s8a.jp/javascript-escape-regexp
                escaped = this.articleKeyword.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
                this.articleKeywordRegex = new RegExp(escaped, "ig");
                this.changeArticles(getMatchedArticles(this.allArticles, this.articleKeyword));
                this.updateQueryString();
            },
            allArticles: function(newValue, oldValue) {
                this.changeArticles(this.allArticles)
            }
        },
        computed: {
            gomidataAvailable() {
                return 0 < this.allArticles.length;
            },
            parentCategories() {
                return Object.keys(this.categoriesById).
                    filter(id => this.categoriesById[id].isParent).
                    map(id => this.categoriesById[id]);
            }
        },
        created() {
            this.changeArticles(this.allArticles);
        },
        methods: {
            getCategoryOrDefault(categoryId, defaultId="unknown") {
                return this.categoriesById[categoryId] || this.commonCategoriesById[defaultId];
            },
            changeArticles(articles) {
                this.waitingArticles = articles.slice();
                this.visibleArticles = [];
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                }
                this.transferArticles(ARTICLE_TRANSFER_UNIT);
            },
            transferArticles(count) {
                count = (count <= 0) ? this.waitingArticles.length : count;
                const articles = this.waitingArticles.splice(0, count);
                this.visibleArticles = this.visibleArticles.concat(articles);
                if (0 < this.waitingArticles.length) {
                    this.timeoutId = setTimeout(() => this.transferArticles(count), 10)
                } else {
                    this.timeoutId = 0;
                }
            },
            articleClicked(article) {
                this.selectedArticle = article;
                this.$nextTick(function() {
                    this.$refs.popupWindow.focus();
                })
            },
            articlePopupKeydown(e) {
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
                    this.closeArticlePopup();
                }
            },
            moveArticleSelection(offset, wraparound) {
                if (0 < this.visibleArticles.length) {
                    const nextIndex = getIndex(this.visibleArticles, this.selectedArticle, offset, wraparound);
                    if (nextIndex !== -1) {
                        this.selectedArticle = this.visibleArticles[nextIndex];
                        this.$refs.article[nextIndex].$el.scrollIntoView(false);
                    }
                }                    
            },
            closeArticlePopup() {
                this.selectedArticle = null;
            },
            dummy(e) {
                e.stopPropagation();
            },
            getKeywordHighlighted(text) {
                return this.articleKeyword ? text.replace(this.articleKeywordRegex, match => "<span class='keyword-highlight'>" + match + "</span>") : text;
            },
            openMunicPopup() {
                this.municPopupVisible = true;
            },
            closeMunicPopup() {
                if (this.selectedMunic) {
                    this.municPopupVisible = false;
                }
            },
            popupMunicClicked(munic) {
                this.municPopupVisible = false;
                this.selectedMunic = munic;
                request(munic.file);
                this.updateQueryString();
            },
            updateQueryString() {
                q = [];
                if (this.selectedMunic) {
                    q.push(`munic=${this.selectedMunic.id}`);
                }
                if (this.articleKeyword) {
                    q.push(`keyword=${this.articleKeyword}`);
                }
                history.replaceState("", "", "?" + q.join("&"));
            }
        }
    });
}

let app = null;
const appState = new AppState();

const vars = getQueryVars();
if (vars.munic) {
    appState.selectedMunic = appState.allMunicsById[vars.munic];
}
if (vars.keyword) {
    appState.initialArticleKeyword = vars.keyword;
}

if (appState.selectedMunic) {
    request(appState.selectedMunic.file);
} else {
    app = createApp(appState);
    appState.municPopupVisible = true;
}

})();
