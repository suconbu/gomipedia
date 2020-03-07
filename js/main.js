
Vue.component('list-item-article', {
    props: ["data", "image"],
    template: `
        <li class="list-item article-list-item">
            <img class="article-icon" :src="image">
            {{data.name}}
            <img class="note-icon" v-if="data.note" src="img/note.png">
        </li>
    `
})

Vue.component('list-item-legend', {
    props: ["data"],
    template: `
        <li class="list-item legend-list-item">
            <img class="legend-icon" :src="data.image">
            {{data.name}}
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
    data.categories = categories;
    const index = Math.floor(Math.random() * gomidata.articles.length);
    data.placeholder = "例：" + gomidata.articles[index].name;
    data.keyword = "";
    data.matchedArticles = [];

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
            keywordChanged: function() {
                const matched = []
                if (this.keyword == "*") {
                    for (let article of this.articles) {
                        matched.push(article);
                    }
                }
                else if (this.keyword) {
                    for (let article of this.articles) {
                        if (~article.name.indexOf(this.keyword)) {
                            matched.push(article);
                        }
                    }
                }
                this.matchedArticles = matched;
            }
        }
    });
}
