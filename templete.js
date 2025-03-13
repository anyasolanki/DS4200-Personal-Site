// Load the data
const socialMedia = d3.csv("socialMedia.csv");

// Once the data is loaded, proceed with plotting
socialMedia.then(function(data) {

    // Convert string values to numbers
    data.forEach(function(d) {
        d.Likes = +d.Likes;  // Convert Likes to a number
        d.Date = new Date(d.Date);  // Convert Date to a Date object for time plotting
    });

    // ------------------------------------------
    // Part 2.1: Side-by-Side Boxplot
    // ------------------------------------------
    const svgBoxplot = d3.select("#boxplot").append("svg")
        .attr("width", 800)
        .attr("height", 400);

    // Set up scales
    const xScale = d3.scaleBand()
        .domain([...new Set(data.map(d => d.Platform))])  // Get unique platforms
        .range([0, 750])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Likes)])
        .nice()
        .range([350, 50]);

    // Rollup function to calculate quantiles
    const rollupFunction = function(groupData) {
        const values = groupData.map(d => d.Likes).sort(d3.ascending);
        const min = d3.min(values);
        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const max = d3.max(values);
        return { min, q1, median, q3, max };
    };

    // Calculate quartiles by platform
    const quartilesByPlatform = d3.rollup(data, rollupFunction, d => d.Platform);

    quartilesByPlatform.forEach((quartiles, platform) => {
        const x = xScale(platform);
        const boxWidth = xScale.bandwidth();

        // Draw the vertical lines for min and max
        svgBoxplot.append("line")
            .attr("x1", x + boxWidth / 2)
            .attr("x2", x + boxWidth / 2)
            .attr("y1", yScale(quartiles.min))
            .attr("y2", yScale(quartiles.max))
            .attr("stroke", "black");

        // Draw the box from q1 to q3
        svgBoxplot.append("rect")
            .attr("x", x)
            .attr("y", yScale(quartiles.q3))
            .attr("width", boxWidth)
            .attr("height", yScale(quartiles.q1) - yScale(quartiles.q3))
            .attr("fill", "lightblue");

        // Draw the median line
        svgBoxplot.append("line")
            .attr("x1", x)
            .attr("x2", x + boxWidth)
            .attr("y1", yScale(quartiles.median))
            .attr("y2", yScale(quartiles.median))
            .attr("stroke", "red")
            .attr("stroke-width", 2);
    });

    // Add x and y axes for the boxplot
    svgBoxplot.append("g")
        .attr("transform", "translate(0,350)")
        .call(d3.axisBottom(xScale));

    svgBoxplot.append("g")
        .attr("transform", "translate(50,0)")
        .call(d3.axisLeft(yScale));

    // ------------------------------------------
    // Part 2.2: Side-by-Side Bar Plot
    // ------------------------------------------
    const svgBarplot = d3.select("#barplot").append("svg")
        .attr("width", 800)
        .attr("height", 400);

    // Summarize the data for average Likes per platform and post type
    const summarizedData = d3.rollup(data, v => d3.mean(v, d => d.Likes), d => d.Platform, d => d.PostType);
    const flatData = [];
    summarizedData.forEach((platformMap, platform) => {
        platformMap.forEach((avgLikes, postType) => {
            flatData.push({ Platform: platform, PostType: postType, AvgLikes: avgLikes });
        });
    });

    // Set up scales
    const x0 = d3.scaleBand()
        .domain([...new Set(flatData.map(d => d.Platform))])
        .range([0, 750])
        .padding(0.1);

    const x1 = d3.scaleBand()
        .domain([...new Set(flatData.map(d => d.PostType))])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const yScaleBar = d3.scaleLinear()
        .domain([0, d3.max(flatData, d => d.AvgLikes)])
        .nice()
        .range([350, 50]);

    const color = d3.scaleOrdinal()
        .domain([...new Set(flatData.map(d => d.PostType))])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

    // Draw bars
    const barGroups = svgBarplot.selectAll("g")
        .data(flatData)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x0(d.Platform)},0)`);

    barGroups.append("rect")
        .attr("x", d => x1(d.PostType))
        .attr("y", d => yScaleBar(d.AvgLikes))
        .attr("width", x1.bandwidth())
        .attr("height", d => 350 - yScaleBar(d.AvgLikes))
        .attr("fill", d => color(d.PostType));

    // Add legend
    const legend = svgBarplot.append("g")
        .attr("transform", "translate(650, 20)");

    const types = [...new Set(flatData.map(d => d.PostType))];
    types.forEach((type, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", color(type));

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 12)
            .text(type);
    });

    // Add x and y axes for the bar plot
    svgBarplot.append("g")
        .attr("transform", "translate(0,350)")
        .call(d3.axisBottom(x0));

    svgBarplot.append("g")
        .attr("transform", "translate(50,0)")
        .call(d3.axisLeft(yScaleBar));

    // ------------------------------------------
    // Part 2.3: Line Plot
    // ------------------------------------------
    const svgLinePlot = d3.select("#lineplot").append("svg")
        .attr("width", 800)
        .attr("height", 400);

    // Summarize data for average Likes per Date
    const summarizedTimeData = Array.from(d3.rollup(data, v => d3.mean(v, d => d.Likes), d => d.Date));

    // Set up scales
    const xScaleTime = d3.scaleTime()
        .domain([d3.min(data, d => d.Date), d3.max(data, d => d.Date)])
        .range([0, 750]);

    const yScaleTime = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Likes)])
        .nice()
        .range([350, 50]);

    // Line path generator
    const line = d3.line()
        .x(d => xScaleTime(d[0]))  // Date
        .y(d => yScaleTime(d[1]))  // Avg Likes
        .curve(d3.curveNatural);

    // Draw line plot
    svgLinePlot.append("path")
        .data([summarizedTimeData])
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2);

    // Add axes for the line plot
    svgLinePlot.append("g")
        .attr("transform", "translate(0,350)")
        .call(d3.axisBottom(xScaleTime));

    svgLinePlot.append("g")
        .attr("transform", "translate(50,0)")
        .call(d3.axisLeft(yScaleTime));

});
