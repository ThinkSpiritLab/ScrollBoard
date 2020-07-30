import * as dto from "./dto";

import React from "react";

interface BoardProps {
    data: dto.Contest;
}

const Board: React.FC<BoardProps> = ({ data }: BoardProps) => {
    return (
        <div>
            hello
        </div>
    );
};

export default Board;