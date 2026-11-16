document.getElementById('testBtn').addEventListener('click', function() {
    const resultText = document.getElementById('result');
    resultText.textContent = 'الملفات الثلاثة تعمل بشكل ممتاز! الكود البرمجي سليم.';
    this.style.display = 'none';
});
