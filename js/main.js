
Vue.component("list-item-article", {
    props: ["article", "category", "click", "highlighter"],
    template: `
        <li class="article-list-item" @click="click(article)">
            <img class="article-icon" :src="category.image">
            <span v-html="highlighter(article.name)" />
            <img class="note-icon" v-if="article.note" src="img/note.png">
        </li>
    `
})

Vue.component("list-item-legend", {
    props: ["category"],
    template: `
        <li class="legend-list-item">
            <img class="legend-icon" :src="category.image">
            {{category.name}}
        </li>
    `
})

const categories = {
    burnable: { "name": "可燃ごみ", "image": "img/burnable.png" },
    unburnable: { "name": "不燃ごみ", "image": "img/unburnable.png" },
    hazardous: { "name": "危険ごみ", "image": "img/hazardous.png" },
    oversized: { "name": "粗大ごみ", "image": "img/oversized.png" },
    recyclable: { "name": "資源", "image": "img/recyclable.png" },
    legalrecycling: { "name": "家電リサイクル法対象", "image": "img/legalrecycling.png" },
    uncollectible: { "name": "回収できません", "image": "img/uncollectible.png" },
    unknown: { "name": "分類不明", "image": "img/unknown.png" }
};

function getIndex(articles, article, offset, wraparound) {
    let index = articles.findIndex(a => a === article);
    if (index === -1) return -1;
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
    return index;
}

function getMatchedArticles(articles, keyword) {
    let matched = [];
    if (keyword) {
        keyword = keyword.toLowerCase()
        matched = matched.concat(articles.filter(article => 
            article.name.toLowerCase() === keyword || (article.nameKana && article.nameKana === keyword)));
        matched = matched.concat(articles.filter(article => 
            matched.indexOf(article) === -1 &&
            (article.name.toLowerCase().startsWith(keyword) || article.nameKana && article.nameKana.startsWith(keyword))));
        matched = matched.concat(articles.filter(article => 
            matched.indexOf(article) === -1 &&
            (article.name.toLowerCase().indexOf(keyword) !== -1 || article.nameKana && article.nameKana.indexOf(keyword) !== -1)));
    } else {
        matched = articles;
    }
    return matched;
}

const data = {};

const request = new XMLHttpRequest();
request.open('GET', "data/gomidata_toyokawa.json");
request.responseType = 'json';
request.send();
request.onload = function() {
    const gomidata = request.response;
    load(gomidata);
}

function load(gomidata) {
    data.municipality = gomidata.municipality;
    data.updatedAt = gomidata.updatedAt;
    data.sourceUrl = gomidata.sourceUrl;
    data.allArticles = gomidata.articles;
    for (let i = 0; i < data.allArticles.length; ++i) {
        data.allArticles[i].id = i;
    }
    data.categories = categories;
    const index = Math.floor(Math.random() * data.allArticles.length);
    data.placeholder = "例：" + data.allArticles[index].name;
    data.keyword = "";
    data.selectedArticle = null;
    data.waitingArticles = [];
    data.appearedArticles = [];
    data.timeoutId = 0;

    const app = new Vue({
        el: "#app",
        data: data,
        watch: {
            keyword: function(newValue, oldValue) {
                this.keyword = newValue;
                this.keywordRegex = new RegExp(this.keyword, "ig");
                this.updateAppearedArticles(getMatchedArticles(this.allArticles, this.keyword));
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
            }
        }
    });
}
