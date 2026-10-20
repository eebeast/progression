(() => {
  const demo = document.querySelector('[data-sync-demo]');
  if (demo) {
    let online = false, phone = 0, cloud = 0, laptop = 0, pending = 0;
    const byId = (id) => document.getElementById(id);
    function render(message) {
      byId('phone-count').value = phone;
      byId('cloud-count').value = cloud;
      byId('laptop-count').value = laptop;
      byId('pending-count').value = pending;
      byId('connection').textContent = online ? 'Online · same signed-in account' : 'Offline · same signed-in account';
      byId('toggle-network').textContent = online ? 'Go offline' : 'Go online';
      byId('demo-status').textContent = message;
    }
    byId('save-set').addEventListener('click', () => {
      phone++; pending++;
      if (online) { cloud += pending; pending = 0; render('Local transaction committed. Foreground sync received server acknowledgement. The laptop has not pulled these sets yet.'); }
      else render('Saved in the phone browser and queued in its outbox. Supabase and the laptop have not received this set.');
    });
    byId('toggle-network').addEventListener('click', () => {
      online = !online;
      if (online) {
        cloud += pending; pending = 0;
        render('Foreground sync runs on reconnect. The server accepts queued changes; acknowledgement clears the outbox. Pull on the laptop to see them.');
      } else render('Disconnected. Existing phone records remain available. Save another set to see what stays local.');
    });
    byId('pull-laptop').addEventListener('click', () => {
      if (!online) render('The laptop cannot pull while offline. Its previous local copy remains available.');
      else { laptop = cloud; render('The laptop pulled accepted server changes into its own IndexedDB. Its observable read can now update the screen.'); }
    });
    byId('reset-demo').addEventListener('click', () => {
      online = false; phone = cloud = laptop = pending = 0;
      render('Simulation reset. Start by saving a set while offline.');
    });
    render('Start by saving a set while offline. The two devices begin with the exercise and session already created.');
  }
  for (const quiz of document.querySelectorAll('[data-quiz]')) {
    for (const button of quiz.querySelectorAll('button[data-correct]')) {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        for (const choice of quiz.querySelectorAll('button')) choice.setAttribute('aria-pressed', String(choice === button));
        const correct = button.dataset.correct === 'true';
        quiz.querySelector('[role="status"]').textContent = (correct ? 'Correct. ' : 'Try the other answer. ') + (correct ? quiz.dataset.explanation : quiz.dataset.hint);
      });
    }
  }
})();
