
Vue.component("list-item-article", {
    props: ["article", "category", "click"],
    template: `
        <li class="list-item article-list-item" @click="click(article)">
            <img class="article-icon" :src="category.image">
            {{article.name}}
            <img class="note-icon" v-if="article.note" src="img/note.png">
        </li>
    `
})

Vue.component("list-item-legend", {
    props: ["category"],
    template: `
        <li class="list-item legend-list-item">
            <img class="legend-icon" :src="category.image">
            {{category.name}}
        </li>
    `
})

const categories = {
    burnable : {
        "name" : "可燃ごみ",
        "image" : "img/burnable.png"
    },
    nonburnable : {
        "name" : "不燃ごみ",
        "image" : "img/nonburnable.png"
    },
    hazardous : {
        "name" : "危険ごみ",
        "image" : "img/hazardous.png"
    },
    oversized : {
        "name" : "粗大ごみ",
        "image" : "img/oversized.png"
    },
    recyclable : {
        "name" : "資源",
        "image" : "img/recyclable.png"
    },
    specificrecycling : {
        "name" : "家電リサイクル法対象",
        "image" : "img/specificrecycling.png"
    },
    uncollectible : {
        "name" : "回収できません",
        "image" : "img/uncollectible.png"
    },
    unknown : {
        "name" : "分類不明",
        "image" : "img/unknown.png"
    }
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
    data.cityName = gomidata.cityName;
    data.updatedAt = gomidata.updatedAt;
    data.articles = gomidata.articles;
    for (let i = 0; i < data.articles.length; ++i) {
        data.articles[i].id = i;
    }
    data.categories = categories;
    const index = Math.floor(Math.random() * gomidata.articles.length);
    data.placeholder = "例：" + gomidata.articles[index].name;
    data.keyword = "";
    data.matchedArticles = gomidata.articles;
    data.selectedArticle = null;

    const app = new Vue({
        el: "#app",
        data: data,
        watch: {
            keyword: function(newValue, oldValue) {
                this.keyword = newValue;
                this.keywordChanged();
            }
        },
        methods: {
            keywordChanged() {
                const matched = []
                if (this.keyword == "") {
                    for (let article of this.articles) {
                        matched.push(article);
                    }
                } else {
                    for (let article of this.articles) {
                        if (~article.name.indexOf(this.keyword)) {
                            matched.push(article);
                        }
                    }
                }
                this.matchedArticles = matched;
            },
            articleClicked(article) {
                this.selectedArticle = article;
                this.$nextTick(function() {
                    this.$refs.popupWindow.focus();
                })
                console.log("selectedArticle.name: " + article.name);
            },
            popupKeydown(e) {
                if (e.key == "ArrowUp" || e.key == "ArrowLeft") {
                    this.moveArticleSelection(-1);
                } else if (e.key == "ArrowDown" || e.key == "ArrowRight") {
                    this.moveArticleSelection(+1);
                } else if (e.key == "Enter") {
                    this.closePopup();
                }
            },
            moveArticleSelection(offset) {
                const wraparound = true;
                const nextIndex = getIndex(this.matchedArticles, this.selectedArticle, offset, wraparound);
                if (nextIndex !== -1) {
                    this.selectedArticle = this.matchedArticles[nextIndex];
                    this.$refs.article[nextIndex].$el.scrollIntoView(false);
                }
            },
            closePopup() {
                this.selectedArticle = null;
            },
            dummy(e) {
                e.stopPropagation();
            }
        }
    });
}
