export const gatherInsightsTool = {
    type: "function",
    function: {
        name: "gatherInsightsTool",
        description: "Generate positive (bull) and negative (bear) insights for a stock or portfolio.",
        parameters: {
            type: "object",
            properties: {
                bullInsights: {
                    type: "array",
                    description: "A list of positive insights (bull case) for the stock or portfolio.",
                    items: {
                        type: "object",
                        properties: {
                            title: {
                                type: "string",
                                description: "Short title for the positive insight.",
                            },
                            description: {
                                type: "string",
                                description: "Detailed description of the positive insight.",
                            },
                            emoji: {
                                type: "string",
                                description: "Emoji representing the positive insight.",
                            },
                        },
                        required: ["title", "description", "emoji"],
                    },
                },
                bearInsights: {
                    type: "array",
                    description: "A list of negative insights (bear case) for the stock or portfolio.",
                    items: {
                        type: "object",
                        properties: {
                            title: {
                                type: "string",
                                description: "Short title for the negative insight.",
                            },
                            description: {
                                type: "string",
                                description: "Detailed description of the negative insight.",
                            },
                            emoji: {
                                type: "string",
                                description: "Emoji representing the negative insight.",
                            },
                        },
                        required: ["title", "description", "emoji"],
                    },
                },
            },
            required: ["bullInsights", "bearInsights"],
        },
    }
}