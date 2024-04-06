export function addSpaceBetweenCharacters(inputString) {
    if (typeof inputString !== 'string') {
        return inputString;
    }
    return inputString.replace(/([a-zA-Z])([\u4E00-\u9FAF])/g, '$1 $2');
}
