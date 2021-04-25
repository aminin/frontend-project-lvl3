import * as yup from 'yup';
import axios from 'axios';
import uniqueId from 'lodash/uniqueId';

import parseRss from './parseRss';
import attachStateHandlers from './stateHandlers';
import { RSS_LOAD_TIMEOUT, RSS_PROXY_URL } from './constants';

const decorateUrlWithProxy = (url) => {
  const decorated = new URL('/get', RSS_PROXY_URL);
  decorated.searchParams.set('disableCache', 'true');
  decorated.searchParams.set('url', url);
  return decorated.toString();
};

const applySelectors = (obj) => (
  Object.fromEntries(Object.entries(obj).map(
    ([key, selector]) => ([key, document.querySelector(selector)]),
  ))
);

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
// Кстати, МБ можно полагаться на message.
const getErrorCode = (e) => e.code ?? 'unknown';

const loadRss = (state, url) => {
  state.loadingProcess.status = 'loading';
  return axios.get(decorateUrlWithProxy(url), { timeout: RSS_LOAD_TIMEOUT })
    .then(({ data }) => {
      const { title, description, items } = parseRss(data.contents);
      const feed = {
        url, id: uniqueId(), title, description,
      };
      const posts = items.map((item) => ({ ...item, channelId: feed.id, id: uniqueId() }));
      state.posts.unshift(...posts);
      state.feeds.unshift(feed);
      state.loadingProcess = { error: null, status: 'idle' };
      state.form = {
        ...state.form,
        error: null,
      };
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      state.loadingProcess = { error: getErrorCode(e), status: 'failed' };
    })
    .finally(() => {
    // Для отладки
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
    ui: {
      seenPosts: new Set(),
    },
  };

  const state = attachStateHandlers(elements, initialState);

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
};
