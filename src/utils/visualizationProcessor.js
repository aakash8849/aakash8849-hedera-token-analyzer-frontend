import * as d3 from 'd3';

export function processVisualizationData(rawData) {
  // Parse CSV data
  const holders = rawData.holders.split('\n')
    .slice(1)
    .filter(line => line.trim())
    .map(line => {
      const [account, balance] = line.split(',');
      return { 
        account, 
        balance: parseFloat(balance) || 0
      };
    });

  const transactions = rawData.transactions.split('\n')
    .slice(1)
    .filter(line => line.trim())
    .map(line => {
      const [timestamp, , sender, amount, receiver] = line.split(',');
      return {
        timestamp: new Date(timestamp),
        sender,
        amount: parseFloat(amount) || 0,
        receiver
      };
    });

  // Find treasury account (account with highest balance)
  const treasuryAccount = holders.reduce((max, holder) => 
    holder.balance > max.balance ? holder : max
  , holders[0]);

  const treasuryId = treasuryAccount.account;
  const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);

  // Calculate balance ranges for visualization
  const balances = holders.map(h => h.balance).filter(b => b > 0);
  const maxBalance = Math.max(...balances);

  // Create scale for node sizes
  const balanceScale = d3.scaleSqrt()
    .domain([0, maxBalance])
    .range([15, 60]);

  // Create color scale based on balance percentages
  const colorScale = d3.scaleThreshold()
    .domain([0.01, 0.05, 0.1])
    .range(['#42C7FF', '#7A73FF', '#FF3B9A']);

  // Create nodes
  const nodes = holders
    .filter(h => h.balance > 0)
    .map(h => {
      const balancePercentage = h.balance / totalSupply;
      return {
        id: h.account,
        value: h.balance,
        percentage: balancePercentage * 100,
        radius: balanceScale(h.balance),
        color: h.account === treasuryId ? '#FFD700' : colorScale(balancePercentage),
        isTreasury: h.account === treasuryId
      };
    });

  // Create links
  const links = transactions
    .filter(tx => {
      const sourceExists = nodes.some(n => n.id === tx.sender);
      const targetExists = nodes.some(n => n.id === tx.receiver);
      return sourceExists && targetExists;
    })
    .map(tx => ({
      source: tx.sender,
      target: tx.receiver,
      value: tx.amount,
      timestamp: tx.timestamp,
      color: tx.sender === treasuryId || tx.receiver === treasuryId ? '#FFD700' : '#42C7FF'
    }));

  return {
    nodes,
    links,
    transactions,
    treasuryId,
    totalSupply,
    maxBalance
  };
}
