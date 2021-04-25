const getText = (el, selector) => (el.querySelector(selector) ?? {}).textContent;

export default (data) => {
  const parser = new DOMParser();
  const dom = parser.parseFromString(data, 'text/xml');

  if (dom.querySelectorAll('parsererror').length > 0) {
    const error = new Error(getText('parsererror'));
    error.code = 'rss_parse_error';
    throw error;
  }

  return {
    title: getText(dom, 'channel > title'),
    description: getText(dom, 'channel > description'),
    items: [...dom.querySelectorAll('item')].map((el) => ({
      title: getText(el, 'title'),
      link: getText(el, 'link'),
      description: getText(el, 'description'),
    })),
  };
};
