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

const handleForm = (elements, state) => {
  const { form: { valid, error } } = state;
  const { input } = elements;
  if (valid) {
    input.classList.remove('is-invalid');
  } else {
    // eslint-disable-next-line no-console
    console.log('error', error);
    input.classList.add('is-invalid');
    renderFeedback(elements, 'danger', error);
  }
};

const handleLoadingProcessStatus = (elements, state) => {
  const { loadingProcess } = state;
  const { submit, input } = elements;
  switch (loadingProcess.status) {
    case 'failed':
      submit.disabled = false;
      input.removeAttribute('readonly');
      renderFeedback(elements, 'danger', loadingProcess.error);
      break;
    case 'idle':
      submit.disabled = false;
      input.removeAttribute('readonly');
      input.value = '';
      renderFeedback(elements, 'success', 'RSS успешно загружен');
      input.focus();
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

const handleFeeds = (elements, state) => {
  const { feeds } = state;
  const { feeds: feedsEl } = elements;
  const fragment = document.createDocumentFragment();
  feedsEl.innerHTML = `
    <h2>Фиды</h2>
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

const handlePosts = (elements, state) => {
  const { posts, ui } = state;
  const { posts: postsEl } = elements;
  const fragment = document.createDocumentFragment();
  postsEl.innerHTML = `
    <h2>Посты</h2>
    <ul class="list-group">
      ${posts.map(({ id, title, link }) => (`
        <li class="list-group-item d-flex justify-content-between align-items-start">
          <a
              href="${link}"
              class="${ui.seenPosts.has(id) ? 'font-weight-normal' : 'font-weight-bold'}"
              data-id="${id}"
              target="_blank"
              rel="noopener noreferrer"
          >${stripMarkup(title)}</a>
        </li>
      `)).join('\n')}
    </ul>
  `;
  postsEl.appendChild(fragment);
};

const attachStateHandlers = (elements, initialState) => onChange(initialState, (path) => {
  const handlers = {
    form: handleForm,
    'loadingProcess.status': handleLoadingProcessStatus,
    feeds: handleFeeds,
    posts: handlePosts,
  };
  return handlers[path] && handlers[path](elements, initialState);
});

export default attachStateHandlers;
