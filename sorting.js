function isSorted(arr) {
    return arr.every(function (x, i) {
        return i === 0 || x >= arr[i - 1];
    });
}
var unsorted = ['Bank 1', 'Another Bank', 'US Traders Coop'];
var sorted = ['Another Bank', 'Bank 1', 'US Traders Coop'];
console.log(isSorted(unsorted));
console.log(isSorted(sorted));