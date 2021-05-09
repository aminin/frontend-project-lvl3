import onChange from 'on-change';

const stripMarkup = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.textContent;
};

const renderFeedback = (elements, type, message) => {
  const { feedback } = elements;
  feedback.classList.forEach((className) => {
    if (className.match(/^text-/)) {
      feedback.classList.remove(className);
    }
  });
  if (type) {
    feedback.classList.add(`text-${type}`);
  }
  feedback.textContent = message;
};

const handleForm = (elements, state, translate) => {
  const { form: { valid, error } } = state;
  const { input } = elements;
  if (valid) {
    input.classList.remove('is-invalid');
  } else {
    input.classList.add('is-invalid');
    renderFeedback(elements, 'danger', translate([`errors.${error}`, 'errors.unknown']));
  }
};

const handleLoadingProcessStatus = (elements, state, translate) => {
  const { loadingProcess } = state;
  const { submit, input } = elements;
  switch (loadingProcess.status) {
    case 'failed':
      submit.disabled = false;
      input.removeAttribute('readonly');
      renderFeedback(elements, 'danger', translate([`errors.${loadingProcess.error}`, 'errors.unknown']));
      break;
    case 'idle':
      submit.disabled = false;
      input.removeAttribute('readonly');
      input.value = '';
      input.focus();
      renderFeedback(elements, 'success', translate('loading.success'));
      break;
    case 'loading':
      submit.disabled = true;
      input.setAttribute('readonly', true);
      renderFeedback(elements, '', '');
      break;
    default:
      throw new Error(`Unknown loadingProcess status: '${loadingProcess.status}'`);
  }
};

const handleFeeds = (elements, state, translate) => {
  const { feeds } = state;
  const { feeds: feedsEl } = elements;
  const fragment = document.createDocumentFragment();
  feedsEl.innerHTML = `
    <h2>${translate('feeds')}</h2>
    <ul class="list-group mb-5">
      ${feeds.map(({ title, description }) => (`
        <li class="list-group-item">
          <h3>${stripMarkup(title)}</h3>
          <p>${stripMarkup(description)}</p>
        </li>
      `)).join('\n')}
    </ul>
  `;
  feedsEl.appendChild(fragment);
};

const handlePosts = (elements, state, translate) => {
  const { posts, ui } = state;
  const { posts: postsEl } = elements;
  const fragment = document.createDocumentFragment();
  postsEl.innerHTML = `
    <h2>${translate('posts')}</h2>
    <ul class="list-group">
      ${posts.map(({ id, title, link }) => (`
        <li class="list-group-item d-flex justify-content-between align-items-start">
          <a
              href="${link}"
              class="${ui.seenPosts.has(String(id)) ? 'font-weight-normal' : 'font-weight-bold'}"
              data-id="${id}"
              target="_blank"
              rel="noopener noreferrer"
          >${stripMarkup(title)}</a>
          <button
              type="button"
              class="btn btn-primary btn-sm"
              data-id="${id}"
              data-toggle="modal"
              data-target="#modal"
          >${translate('preview')}</button>
        </li>
      `)).join('\n')}
    </ul>
  `;
  postsEl.appendChild(fragment);
};

const handlePreviewPost = (elements, state) => {
  const post = state.posts.find((postData) => postData.id === state.modal.postId);

  if (!post) return;

  const title = elements.modal.querySelector('.modal-title');
  const body = elements.modal.querySelector('.modal-body');
  const fullArticleLink = elements.modal.querySelector('.full-article');

  title.textContent = post.title;
  body.textContent = post.description;
  fullArticleLink.href = post.link;
};

const handlers = {
  form: handleForm,
  'loadingProcess.status': handleLoadingProcessStatus,
  feeds: handleFeeds,
  posts: handlePosts,
  'ui.seenPosts': handlePosts,
  'modal.postId': handlePreviewPost,
};

const attachStateHandlers = (elements, initialState, translate) => (
  onChange(
    initialState,
    (path) => handlers[path]?.(elements, initialState, translate),
  )
);

const applyTranslations = (elements, translate) => {
  elements.h1.innerText = translate('h1');
  elements.lead.innerText = translate('lead');
  elements.example.innerText = translate('example');
  elements.submit.innerText = translate('submit');
  elements.modalReadAll.innerText = translate('modalReadAll');
  elements.modalClose.innerText = translate('modalClose');
};

export { attachStateHandlers, applyTranslations };
