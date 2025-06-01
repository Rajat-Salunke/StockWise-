// header
const bar = document.getElementById("bar");
//const nav = document.getElementById("nav");

bar.onclick = (e) => {
    const icon = e.target.getAttribute("class")
    if(icon == "fa-solid fa-bars"){
        e.target.setAttribute("class","fa-solid fa-xmark")

    }else{
        e.target.setAttribute("class","fa-solid fa-bars")
    }
    nav.classList.toggle("showNav")
}


// carousel
const carouselContainer = document.querySelector(".carouselContainer");
const eachCarousel = document.querySelector(".eachCarousel").clientWidth;
const allEachCarousel = document.querySelectorAll(".eachCarousel");
const allIndicator = document.querySelectorAll(".indicator");

const slideCarousel = (index) => {
    for(let x = 0; x<allEachCarousel.length;x++){
        if(x === index){
            allEachCarousel[x].classList.add("eachCarouselBorder")
            allIndicator[x].classList.add("activeIndicator")
        }else{
            allEachCarousel[x].classList.remove("eachCarouselBorder")
            allIndicator[x].classList.remove("activeIndicator")
        }
    }
   carouselContainer.scrollLeft = (index * (eachCarousel + 10))
   console.log(carouselContainer.scrollLeft)
}

const API_KEY = "cvtobvhr01qjg135bp5gcvtobvhr01qjg135bp60";
    const ALPHA_VANTAGE_API_KEY = "N5P8LHI5XRGN63C1";
    let chart, intervalId;
    let chartData = { labels: [], prices: [], sma: [], ema: [] };
    let userBalance = 100000;
    let investedAmount = 0;
    let purchasedPrice = 0;

    async function startRealtimeChart() {
      const ticker = document.getElementById("stockInput").value.toUpperCase();
      const showSMA = document.getElementById("smaCheckbox").checked;
      const showEMA = document.getElementById("emaCheckbox").checked;

      if (!ticker) return alert("Please enter a stock ticker!");
      clearInterval(intervalId);
      chartData = { labels: [], prices: [], sma: [], ema: [] };
      if (chart) chart.destroy();

      const ctx = document.getElementById("stockChart").getContext("2d");
      chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: `${ticker} Live Price`,
              data: chartData.prices,
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              fill: true,
              tension: 0.3
            },
            {
              label: "SMA (5)",
              data: chartData.sma,
              borderColor: "orange",
              borderWidth: 1.5,
              borderDash: [5, 5],
              fill: false,
              hidden: !showSMA
            },
            {
              label: "EMA (5)",
              data: chartData.ema,
              borderColor: "purple",
              borderWidth: 1.5,
              borderDash: [5, 2],
              fill: false,
              hidden: !showEMA
            }
          ]
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            x: { ticks: { maxTicksLimit: 10 } }
          }
        }
      });

      intervalId = setInterval(async () => {
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesAgo = now - 300;

        const quoteURL = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
        const smaURL = `https://finnhub.io/api/v1/indicator?symbol=${ticker}&resolution=1&from=${fiveMinutesAgo}&to=${now}&indicator=sma&timeperiod=5&token=${API_KEY}`;
        const emaURL = `https://finnhub.io/api/v1/indicator?symbol=${ticker}&resolution=1&from=${fiveMinutesAgo}&to=${now}&indicator=ema&timeperiod=5&token=${API_KEY}`;

        try {
          const [quoteRes, smaRes, emaRes] = await Promise.all([
            fetch(quoteURL).then(r => r.json()),
            fetch(smaURL).then(r => r.json()),
            fetch(emaURL).then(r => r.json())
          ]);

          const time = new Date().toLocaleTimeString();
          const price = quoteRes.c;

          chartData.labels.push(time);
          chartData.prices.push(price);
          chartData.sma.push(smaRes.sma?.at(-1) || null);
          chartData.ema.push(emaRes.ema?.at(-1) || null);

          if (chartData.labels.length > 20) {
            chartData.labels.shift();
            chartData.prices.shift();
            chartData.sma.shift();
            chartData.ema.shift();
          }

          chart.update();
          fetchNews(ticker);
          fetchCandlestickData(ticker);

        } catch (err) {
          console.error("Error:", err);
        }
      }, 10000);
    }

    async function fetchNews(ticker) {
      const today = new Date().toISOString().split("T")[0];
      const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      try {
        const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${today}&token=${API_KEY}`);
        const news = await res.json();

        const newsContainer = document.getElementById("newsContainer");
        newsContainer.innerHTML = "";

        news.slice(0, 5).forEach(article => {
          const card = document.createElement("div");
          card.className = "news-card";
          card.innerHTML = `
            <h3>${article.headline}</h3>
            <p>${article.summary || "No summary available."}</p>
            <a href="${article.url}" target="_blank">Read more →</a>
            <p>${new Date(article.datetime).toLocaleString()}</p>
          `;
          newsContainer.appendChild(card);
        });
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    }

    async function fetchCandlestickData(ticker) {
      const API_URL = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        const timeSeries = data['Time Series (Daily)'];

        const chartData = Object.keys(timeSeries).slice(0, 30).map(date => {
          const dayData = timeSeries[date];
          return {
            x: new Date(date),
            y: [
              parseFloat(dayData['1. open']),
              parseFloat(dayData['2. high']),
              parseFloat(dayData['3. low']),
              parseFloat(dayData['4. close'])
            ]
          };
        }).reverse();

        renderCandlestickChart(chartData);
      } catch (error) {
        console.error("Error fetching candlestick data:", error);
      }
    }

    function renderCandlestickChart(chartData) {
      const options = {
        chart: { type: 'candlestick', height: 450 },
        series: [{ name: 'Stock Price', data: chartData }],
        xaxis: { type: 'datetime' },
        yaxis: { tooltip: { enabled: true } }
      };
      const chart = new ApexCharts(document.querySelector("#candlestickChart"), options);
      chart.render();
    }

    async function investInStock() {
      const ticker = document.getElementById("stockInput").value.toUpperCase();
      const investmentAmount = parseFloat(document.getElementById("investmentAmount").value);
      if (!ticker || isNaN(investmentAmount) || investmentAmount <= 0 || investmentAmount > userBalance) {
        return alert("Please enter a valid amount to invest.");
      }

      try {
        const quoteURL = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
        const quoteRes = await fetch(quoteURL);
        const quoteData = await quoteRes.json();
        const currentPrice = quoteData.c;

        purchasedPrice = currentPrice;
        investedAmount = investmentAmount;

        userBalance -= investmentAmount;
        document.getElementById("balanceDisplay").innerText = `Balance: ₹${userBalance.toFixed(2)}`;
        document.getElementById("investmentStatus").innerText = `Invested ₹${investmentAmount} in ${ticker} at price ₹${purchasedPrice.toFixed(2)}`;
      } catch (error) {
        console.error("Error investing in stock:", error);
      }
    }

    async function sellStock() {
      if (investedAmount <= 0) {
        return alert("You haven't made any investment yet.");
      }

      try {
        const ticker = document.getElementById("stockInput").value.toUpperCase();
        const quoteURL = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
        const quoteRes = await fetch(quoteURL);
        const quoteData = await quoteRes.json();
        const currentPrice = quoteData.c;

        const profitLoss = (currentPrice - purchasedPrice) * (investedAmount / purchasedPrice);
        userBalance += investedAmount + profitLoss;

        investedAmount = 0;
        purchasedPrice = 0;

        document.getElementById("balanceDisplay").innerText = `Balance: ₹${userBalance.toFixed(2)}`;
        document.getElementById("investmentStatus").innerText = `Sold stock for ₹${currentPrice.toFixed(2)}. Profit/Loss: ₹${profitLoss.toFixed(2)}`;
      } catch (error) {
        console.error("Error selling stock:", error);
      }
    }
