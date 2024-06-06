const BASE = 'rgb(35, 33, 54)';
const COLORS = [
    'rgb(235, 111, 146)', 'rgb(246, 193, 119)', 'rgb(234, 154, 151)', 
    'rgb(62, 143, 176)', 'rgb(156, 207, 216)', 'rgb(196, 167, 231)','rgb(137, 190, 169)','rgb(80, 81, 144)'
];
const DIRECTIONS = [
    {dx: 0, dy: 1}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: -1, dy: 0}
];
const ROWS = 7;
const BLOCK_SIZE = 90; // Reduced block size to accommodate padding
const PADDING = 10; // Padding between blocks
const CORNER_RADIUS = 10; // Radius for rounded corners

function valueToColor(value) {
    const index = Math.log2(value) - 1;
    return COLORS[index % COLORS.length];
}

class Block {
    constructor(value) {
        this.value = value;
        this.color = valueToColor(value);
        this.size = 0; // Start with size 0 for animation
    }

    animate() {
        if (this.size < BLOCK_SIZE) {
            this.size += 5; // Increase size by 5px per frame
            return true; // Continue animation
        } else {
            this.size = BLOCK_SIZE; // Ensure size is exactly BLOCK_SIZE
            return false; // Stop animation
        }
    }
}

class Game {
    constructor(canvas, messageDiv, scoreDiv, restartButton) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.messageDiv = messageDiv;
        this.scoreDiv = scoreDiv;
        this.restartButton = restartButton;
        this.columns = Array.from({ length: 5 }, () => []);
        this.nextBlock = new Block(2 ** Math.floor(Math.random() * 3 + 1));
        this.debug = true;
        this.gameOver = false;
        this.animating = false; // Track animation state

        canvas.addEventListener('click', (event) => {
            if (!this.gameOver) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                this.handleClick(x);
            }
        });

        restartButton.addEventListener('click', () => {
            this.restartGame();
        });

        if (this.debug) {
            console.log("Debug mode activated.");
        }

        this.loop();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    draw() {
        const { ctx } = this;
        const highestBlockValue = this.getHighestBlockValue();
        const highestBlockColor = valueToColor(highestBlockValue);

        // Update the background color behind the main screen
        document.body.style.backgroundColor = highestBlockColor;

        ctx.fillStyle = BASE;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.columns.forEach((column, i) => {
            column.forEach((block, j) => {
                ctx.fillStyle = block.color;
                const size = block.size;
                const offsetX = (BLOCK_SIZE - size) / 2;
                const offsetY = (BLOCK_SIZE - size) / 2;
                ctx.save();
                ctx.translate(i * (BLOCK_SIZE + PADDING) + PADDING + offsetX, j * (BLOCK_SIZE + PADDING) + PADDING + offsetY);
                this.drawRoundedRect(ctx, 0, 0, size, size, CORNER_RADIUS);
                ctx.restore();

                ctx.fillStyle = 'rgb(10, 10, 10)';
                ctx.font = '36px Arial';
                const text = block.value.toString();
                const textWidth = ctx.measureText(text).width;
                const textX = i * (BLOCK_SIZE + PADDING) + PADDING + BLOCK_SIZE / 2 - textWidth / 2;
                const textY = j * (BLOCK_SIZE + PADDING) + PADDING + BLOCK_SIZE / 2 + 10;
                ctx.fillText(text, textX, textY);
            });
        });

        // Draw the next block
        ctx.fillStyle = this.nextBlock.color;
        this.drawRoundedRect(ctx, 0, ROWS * (BLOCK_SIZE + PADDING) + PADDING, BLOCK_SIZE, BLOCK_SIZE, CORNER_RADIUS);
        ctx.fillStyle = 'rgb(10, 10, 10)';
        ctx.font = '36px Arial';
        const nextText = this.nextBlock.value.toString();
        const nextTextWidth = ctx.measureText(nextText).width;
        const nextTextX = PADDING + BLOCK_SIZE / 2 - nextTextWidth / 2;
        const nextTextY = ROWS * (BLOCK_SIZE + PADDING) + PADDING + BLOCK_SIZE / 2 + 10;
        ctx.fillText(nextText, nextTextX, nextTextY);

        // Display the score
        this.updateScore();
    }

    updateScore() {
        const score = this.columns.flat().reduce((sum, block) => sum + block.value, 0);
        this.scoreDiv.textContent = `Score: ${score}`;
    }

    getHighestBlockValue() {
        let max = 0;
        this.columns.forEach(column => {
            column.forEach(block => {
                if (block.value > max) {
                    max = block.value;
                }
            });
        });
        return max;
    }

    addBlock(column) {
        if (this.columns[column].length < ROWS || 
            (this.columns[column].length && this.columns[column][this.columns[column].length - 1].value === this.nextBlock.value)) {
            let row = this.columns[column].length;
            let count = 0;

            DIRECTIONS.forEach(({dx, dy}) => {
                let x = column;
                let y = row;

                if (x + dx >= 0 && x + dx < this.columns.length &&
                    y + dy >= 0 && y + dy < ROWS &&
                    this.columns[x + dx].length > y + dy &&
                    this.columns[x + dx][y + dy].value === this.nextBlock.value) {
                        count += 1;
                        this.columns[x + dx].splice(y + dy, 1);
                }
            });

            if (count > 0) {
                this.nextBlock = new Block(this.nextBlock.value * (2 ** count));
                this.addBlock(column);
            } else {
                this.columns[column].push(this.nextBlock);
                this.nextBlock = new Block(2 ** Math.floor(Math.random() * 3 + 1));
                this.animating = true; // Start animation
            }
        }
    }

    combineBlocks() {
        this.columns.forEach(column => {
            for (let i = 0; i < column.length - 1; i++) {
                if (column[i].value === column[i + 1].value) {
                    column[i].value *= 2;
                    column[i].color = valueToColor(column[i].value);
                    column[i].size = BLOCK_SIZE / 2; // Start with half size for animation
                    column.splice(i + 1, 1);
                    this.animating = true; // Start animation
                }
            }
        });
    }
    
    combineBlocksSideways() {
        for (let j = 0; j < ROWS; j++) {
            let i = 0;
            while (i < 4) {
                if (this.columns[i].length > j && this.columns[i + 1].length > j &&
                    this.columns[i][j].value === this.columns[i + 1][j].value) {
                    this.columns[i + 1][j].value *= 2;
                    this.columns[i + 1][j].color = valueToColor(this.columns[i + 1][j].value);
                    this.columns[i + 1][j].size = BLOCK_SIZE / 2; // Start with half size for animation
                    this.columns[i].splice(j, 1);
                    this.animating = true; // Start animation
                }
                i++;
            }
        }
    }

    handleClick(x) {
        const column = Math.floor(x / (BLOCK_SIZE + PADDING));
        this.addBlock(column);
    }

    endGame() {
        let flag = false;
        for (const column of this.columns) {
            if (column.length < ROWS) {
                flag = false;
                break;
            }
            if (column[column.length - 1].value === this.nextBlock.value) {
                flag = false;
                break;
            }
            flag = true;
        }
        return flag;
    }

    animate() {
        this.columns.forEach(column => {
            column.forEach(block => {
                if (block.animate()) {
                    this.animating = true
                }
            });
        });
    }

    async loop() {
        while (!this.gameOver) {
            this.combineBlocks();

            this.combineBlocks();
            this.combineBlocksSideways();
            this.combineBlocksSideways();


            this.draw();

            if (this.animating) {
                this.animate();  // Perform animation step
            }

            if (this.endGame()) {
                this.gameOver = true;
                this.messageDiv.style.display = 'block';
                this.restartButton.style.display = 'block';
            }

            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    restartGame() {
        this.columns = Array.from({ length: 5 }, () => []);
        this.nextBlock = new Block(2 ** Math.floor(Math.random() * 3 + 1));
        this.gameOver = false;
        this.messageDiv.style.display = 'none';
        this.restartButton.style.display = 'none';
        this.animating = false;
        this.scoreDiv.textContent = 'Score: 0';
        this.loop();
    }
}

window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const messageDiv = document.getElementById('gameOverMessage');
    const scoreDiv = document.getElementById('score');
    const restartButton = document.getElementById('restartButton');

    canvas.width = 500;
    canvas.height = ROWS * (BLOCK_SIZE + PADDING) + BLOCK_SIZE + 2 * PADDING;

    game =new Game(canvas, messageDiv, scoreDiv, restartButton);
};