import 'bootstrap';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import has from 'lodash/has';
import i18next from 'i18next';

import parseRss from './parseRss';
import { attachStateHandlers, applyTranslations } from './view';
import { RSS_LOAD_TIMEOUT, RSS_UPDATE_TIMEOUT, RSS_PROXY_URL } from './constants';
import locales from './locales/index';

const decorateUrlWithProxy = (url) => {
  const decorated = new URL('/get', RSS_PROXY_URL);
  decorated.searchParams.set('disableCache', 'true');
  decorated.searchParams.set('url', url);
  return decorated.toString();
};

const applySelectors = (obj) => _.mapValues(obj, (selector) => document.querySelector(selector));

const urlValidationSchema = yup.string().url().required();

const validateUrl = (url, feeds) => {
  const feedUrls = feeds.map((feed) => feed.url);
  const uniqueUrlValidationSchema = urlValidationSchema.notOneOf(feedUrls);
  try {
    uniqueUrlValidationSchema.validateSync(url);
    return null;
  } catch (e) {
    e.code = e.type ? `validation_${e.type}` : 'validation_unknown';
    return e;
  }
};

// Код добавим какой нужно, если нет.
const getErrorCode = (e) => {
  if (e.isAxiosError) {
    e.code = 'network_error';
  }
  return e.code ?? 'unknown';
};

const loadRss = (state, url) => {
  state.loadingProcess.status = 'loading';
  return axios.get(decorateUrlWithProxy(url), { timeout: RSS_LOAD_TIMEOUT })
    .then(({ data }) => {
      const { title, description, items } = parseRss(data.contents);
      const feed = {
        url, id: _.uniqueId(), title, description,
      };
      const posts = items.map((item) => ({ ...item, channelId: feed.id, id: _.uniqueId() }));
      state.posts.unshift(...posts);
      state.feeds.unshift(feed);
      state.loadingProcess.error = null;
      state.loadingProcess.status = 'idle';
      state.form = {
        ...state.form,
        error: null,
      };
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      state.loadingProcess.error = getErrorCode(e);
      state.loadingProcess.status = 'failed';
    })
    .finally(() => {
    // Для отладки
    });
};

const fetchUpdates = (state) => {
  const promises = state.feeds.map((feed) => axios.get(decorateUrlWithProxy(feed.url))
    .then(({ data }) => {
      const { items } = parseRss(data.contents);
      const newPosts = items.map((item) => ({ ...item, channelId: feed.id }));
      const oldPosts = state.posts.filter((post) => post.channelId === feed.id);
      const posts = _.differenceWith(newPosts, oldPosts, (p1, p2) => p1.link === p2.link)
        .map((post) => ({ ...post, id: _.uniqueId() }));
      if (posts.length > 0) {
        state.posts.unshift(...posts);
      }
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.log(e);
    }));
  Promise.all(promises).finally(() => {
    setTimeout(() => fetchUpdates(state), RSS_UPDATE_TIMEOUT);
  });
};

export default () => {
  const elements = applySelectors({
    form: '.rss-form',
    input: '.rss-form input',
    feedback: '.feedback',
    submit: '.rss-form button[type="submit"]',
    feeds: '.feeds',
    posts: '.posts',
    modal: '#modal',
    // Для переводов
    modalReadAll: '#modal .full-article',
    modalClose: '#modal .modal-footer [data-dismiss=modal]',
    h1: 'h1',
    lead: '.lead',
    example: '.text-muted',
  });

  const initialState = {
    feeds: [],
    posts: [],
    form: {
      error: null,
      valid: false,
    },
    loadingProcess: {
      error: null,
      status: 'idle', // failed idle loading
    },
    modal: {
      postId: null,
    },
    ui: {
      seenPosts: new Set(),
    },
  };

  // return Promise
  return i18next.createInstance().init({
    lng: 'ru',
    debug: false,
    resources: locales,
  }).then((translate) => {
    applyTranslations(elements, translate);
    const state = attachStateHandlers(elements, initialState, translate);

    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const url = data.get('url');
      const error = validateUrl(url, state.feeds);
      if (!error) {
        state.form = {
          ...state.form,
          valid: true,
          error: null,
        };
        loadRss(state, url);
      } else {
        state.form = {
          ...state.form,
          valid: false,
          error: getErrorCode(error),
        };
      }
    });

    // Делегируем клик по посту, чтобы оталедить просмотр.
    elements.posts.addEventListener('click', (e) => {
      if (!has(e.target.dataset, 'id')) {
        return;
      }

      const { id } = e.target.dataset;
      state.modal.postId = String(id);
      state.ui.seenPosts.add(id);
    });

    setTimeout(() => fetchUpdates(state), RSS_UPDATE_TIMEOUT);
  });
};
