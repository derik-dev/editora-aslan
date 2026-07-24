(function () {
  var FORM_SUBMIT_EMAIL = 'ericpereira@editoraaslan.com';
  var forms = document.querySelectorAll('form[data-mailto-form]');
  if (!forms.length) return;

  function getLabel(form, field) {
    var label = field.closest('label');
    if (label) {
      var explicit = label.querySelector('span');
      if (explicit && explicit.textContent.trim()) return explicit.textContent.trim();
      if (label.textContent.trim()) return label.textContent.trim();
    }

    if (field.id) {
      var labels = form.querySelectorAll('label');
      for (var i = 0; i < labels.length; i += 1) {
        if (labels[i].htmlFor === field.id && labels[i].textContent.trim()) {
          return labels[i].textContent.trim();
        }
      }
    }

    return (field.getAttribute('aria-label') || field.name || field.id || 'Campo')
      .replace(/[_-]+/g, ' ')
      .trim();
  }

  function getValue(field) {
    if (field.tagName === 'SELECT' && field.selectedIndex >= 0) {
      return field.options[field.selectedIndex].text;
    }

    return field.value;
  }

  function getRows(form) {
    var rows = [];

    Array.prototype.forEach.call(form.elements, function (field) {
      if (field.disabled) return;
      if (/^(button|submit|reset|file)$/i.test(field.type)) return;
      if (/^(checkbox|radio)$/i.test(field.type) && !field.checked) return;

      var value = getValue(field).trim();
      if (!value) return;

      rows.push(getLabel(form, field) + ': ' + value);
    });

    return rows;
  }

  function getReplyTo(form) {
    var email = form.querySelector('input[type="email"]');
    return email && email.value ? email.value.trim() : '';
  }

  function getStatus(form) {
    var status = form.querySelector('[data-form-status]');
    if (status) return status;

    status = document.createElement('p');
    status.setAttribute('data-form-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.margin = '14px 0 0';
    status.style.fontWeight = '700';
    status.style.fontSize = '0.9rem';

    form.appendChild(status);
    return status;
  }

  function addFieldsWithoutName(form, data) {
    Array.prototype.forEach.call(form.elements, function (field) {
      if (field.disabled || field.name || !field.id) return;
      if (/^(button|submit|reset|file)$/i.test(field.type)) return;
      if (/^(checkbox|radio)$/i.test(field.type) && !field.checked) return;

      var value = getValue(field).trim();
      if (value) data.append(field.id, value);
    });
  }

  function setButton(button, busy) {
    if (!button) return;
    if (busy) {
      button.setAttribute('data-original-html', button.innerHTML);
      button.textContent = 'Enviando...';
      button.disabled = true;
      return;
    }

    button.disabled = false;
    var original = button.getAttribute('data-original-html');
    if (original) button.innerHTML = original;
  }

  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var subject = form.getAttribute('data-mailto-subject') || 'Mensagem pelo site - Editora Aslan';
      var endpoint = form.getAttribute('data-form-endpoint') || 'https://formsubmit.co/ajax/' + FORM_SUBMIT_EMAIL;
      var status = getStatus(form);
      var button = event.submitter || form.querySelector('[type="submit"]');
      var data = new FormData(form);
      var replyTo = getReplyTo(form);

      addFieldsWithoutName(form, data);
      data.append('_subject', subject);
      data.append('_template', 'table');
      data.append('_captcha', 'false');
      data.append('_honey', '');
      data.append('pagina_origem', window.location.href);
      data.append('resumo_do_envio', getRows(form).join('\n'));
      if (replyTo) data.append('_replyto', replyTo);

      status.textContent = '';
      setButton(button, true);

      fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          return response.json()
            .catch(function () {
              return { message: 'Resposta invalida do FormSubmit.' };
            })
            .then(function (payload) {
              if (!response.ok || payload.success === false) {
                throw new Error(payload.message || 'Falha no envio pelo FormSubmit');
              }
              return payload;
            });
        })
        .then(function () {
          form.reset();
          status.style.color = '#2f6f3e';
          status.textContent = 'Mensagem enviada. Retornaremos em até 48h.';
        })
        .catch(function (error) {
          status.style.color = '#8b1e12';
          status.textContent = error.message || 'Não foi possível enviar agora. Tente novamente em instantes.';
        })
        .finally(function () {
          setButton(button, false);
        });
    });
  });
})();
